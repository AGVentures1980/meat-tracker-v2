import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { randomUUID, createHash } from 'crypto';

const prisma = new PrismaClient();

export class PulseController {
    /**
     * POST /api/v1/pulse/handoff (and /api/v1/auth/pulse-handoff)
     * Generates a short-lived (5 min), cryptographically signed Handoff Token for BRASA Pulse.
     * Enforces client-level product entitlement server-side (Requirement 8).
     * Contains cryptographically unique `jti` for replay protection.
     * Derived strictly from authenticated session context (Zero-Trust).
     */
    static async generateHandoff(req: Request, res: Response) {
        try {
            // Environment-aware Brand Pulse destination configuration (Requirement 7 & 15)
            const pulseBaseUrl = process.env.PULSE_BASE_URL ||
                process.env.BRAND_PULSE_URL ||
                (process.env.NODE_ENV === 'production' ? 'https://pulse.brasameat.com' : 'http://localhost:3001');

            // Dedicated SSO Secret ONLY (No hardcoded fallback secret). Fail closed if absent.
            const ssoSecret = process.env.PULSE_SSO_SECRET;
            if (!ssoSecret || ssoSecret.trim().length === 0) {
                console.error('[SSO SENDER FAIL] Dedicated PULSE_SSO_SECRET environment variable is missing on sender.');
                return res.status(500).json({
                    error: 'PULSE_SSO_NOT_CONFIGURED',
                    status: 'PULSE_SSO_NOT_CONFIGURED',
                    message: 'Dedicated SSO secret PULSE_SSO_SECRET is not configured on BRASA Meat sender.'
                });
            }

            const user = (req as any).user;
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized: Session missing' });
            }

            const userId = String(user.id || user.userId);
            const userAssignedCompanyId = user.companyId || user.company_id ? String(user.companyId || user.company_id) : null;
            const role = String(user.role || 'viewer');

            // 1. Authoritative MASTER check derived ONLY from session role / flags (NO email checks)
            const isMasterUser = Boolean(
                role === 'master' ||
                role === 'admin' ||
                role === 'director' ||
                user.is_master === true ||
                user.is_primary === true ||
                user.scope?.type === 'GLOBAL' ||
                user.scope?.type === 'PARTNER' ||
                (!userAssignedCompanyId || userAssignedCompanyId === 'null' || userAssignedCompanyId === 'undefined')
            );

            // Read client UI requested context
            const clientReqCompanyId = (req.body?.companyId || req.headers['x-company-id']) as string | undefined;
            const clientRequestedLoc = req.body?.activeLocationId || req.body?.storeId || req.headers['x-store-id'];

            // 2. Validate Organization Access (Zero-Trust Server Validation)
            let organizationId: string | null = null;

            if (isMasterUser) {
                organizationId = (clientReqCompanyId && String(clientReqCompanyId).trim() !== '' && String(clientReqCompanyId) !== 'undefined')
                    ? String(clientReqCompanyId).trim()
                    : (userAssignedCompanyId || 'tdb-main');
            } else {
                if (!userAssignedCompanyId) {
                    console.warn(`[SSO DENIED] Non-MASTER user ${userId} has no assigned companyId in session.`);
                    return res.status(403).json({
                        error: 'PULSE_ORGANIZATION_UNAUTHORIZED',
                        status: 'PULSE_ORGANIZATION_UNAUTHORIZED',
                        message: 'User session has no authorized organization assignment.'
                    });
                }

                if (clientReqCompanyId && String(clientReqCompanyId).trim() !== '' && String(clientReqCompanyId) !== 'undefined') {
                    const requestedComp = String(clientReqCompanyId).trim();
                    if (requestedComp !== userAssignedCompanyId) {
                        console.warn(`[SSO DENIED] Cross-tenant escalation attempt by user ${userId}: assigned ${userAssignedCompanyId}, requested ${requestedComp}`);
                        return res.status(403).json({
                            error: 'PULSE_ORGANIZATION_UNAUTHORIZED',
                            status: 'PULSE_ORGANIZATION_UNAUTHORIZED',
                            message: 'Unauthorized cross-organization access request.'
                        });
                    }
                }
                organizationId = userAssignedCompanyId;
            }

            // 3. Validate Server-Side Product Entitlement
            if (organizationId) {
                const entitlement = await prisma.organizationProductEntitlement.findUnique({
                    where: {
                        company_id_product_code: {
                            company_id: organizationId,
                            product_code: 'BRASA_PULSE'
                        }
                    }
                });

                if (!entitlement || entitlement.status !== 'ACTIVE') {
                    console.warn(`[SSO DENIED] Organization ${organizationId} lacks ACTIVE BRASA_PULSE entitlement.`);
                    return res.status(403).json({
                        error: 'PULSE_ENTITLEMENT_REQUIRED',
                        status: 'PULSE_NOT_ENTITLED',
                        message: 'BRASA Pulse module is not enabled for this organization.'
                    });
                }
            }

            // 4. Derive Allowed Location Scope & Validate Active Store Request
            let allowedLocationIds: string[] = [];
            let primaryLocationId: string | null = null;
            let activeLocationId: string | null = null;

            if (isMasterUser) {
                allowedLocationIds = ['*'];
                const companyStores = await prisma.store.findMany({
                    where: { company_id: organizationId },
                    select: { id: true }
                });
                const companyStoreIds = companyStores.map(s => String(s.id));

                if (clientRequestedLoc) {
                    const reqLocStr = String(clientRequestedLoc).trim();
                    if (reqLocStr && reqLocStr !== 'undefined' && reqLocStr !== 'null') {
                        const parsedId = parseInt(reqLocStr, 10);
                        if (!isNaN(parsedId)) {
                            const storeRecord = await prisma.store.findUnique({ where: { id: parsedId } });
                            if (storeRecord && storeRecord.company_id === organizationId) {
                                activeLocationId = reqLocStr;
                                primaryLocationId = reqLocStr;
                            }
                        }
                    }
                }

                if (!primaryLocationId && companyStoreIds.length > 0) {
                    primaryLocationId = companyStoreIds[0];
                    activeLocationId = companyStoreIds[0];
                }
            } else if (user.store_id || user.storeId) {
                // GM / Single store user
                const userStoreIdStr = String(user.store_id || user.storeId);
                allowedLocationIds = [userStoreIdStr];
                primaryLocationId = userStoreIdStr;
                activeLocationId = userStoreIdStr;

                // Reject cross-store tampering
                if (clientRequestedLoc) {
                    const reqLocStr = String(clientRequestedLoc).trim();
                    if (reqLocStr && reqLocStr !== 'undefined' && reqLocStr !== 'null' && reqLocStr !== userStoreIdStr) {
                        console.warn(`[SSO DENIED] Cross-store escalation attempt by user ${userId}: assigned ${userStoreIdStr}, requested ${reqLocStr}`);
                        return res.status(403).json({
                            error: 'PULSE_LOCATION_UNAUTHORIZED',
                            status: 'PULSE_LOCATION_UNAUTHORIZED',
                            message: 'Unauthorized cross-location access request.'
                        });
                    }
                }
            } else if (role === 'area_manager' || (user.scope && user.scope.type === 'AREA')) {
                const areaStores = await prisma.store.findMany({
                    where: { area_manager_id: userId },
                    select: { id: true }
                });
                if (areaStores.length > 0) {
                    allowedLocationIds = areaStores.map(s => String(s.id));
                } else if (user.scope?.storeIds && Array.isArray(user.scope.storeIds)) {
                    allowedLocationIds = user.scope.storeIds.map((id: any) => String(id));
                }

                if (clientRequestedLoc) {
                    const reqLocStr = String(clientRequestedLoc).trim();
                    if (reqLocStr && reqLocStr !== 'undefined' && reqLocStr !== 'null') {
                        if (!allowedLocationIds.includes(reqLocStr)) {
                            console.warn(`[SSO DENIED] Area Manager ${userId} requested store ${reqLocStr} outside assigned scope ${allowedLocationIds.join(',')}`);
                            return res.status(403).json({
                                error: 'PULSE_LOCATION_UNAUTHORIZED',
                                status: 'PULSE_LOCATION_UNAUTHORIZED',
                                message: 'Requested location is outside your assigned area scope.'
                            });
                        }
                        activeLocationId = reqLocStr;
                        primaryLocationId = reqLocStr;
                    }
                }
                if (!primaryLocationId) {
                    primaryLocationId = allowedLocationIds[0] || null;
                    activeLocationId = primaryLocationId;
                }
            } else if (organizationId) {
                // Corporate Admin / Director
                const companyStores = await prisma.store.findMany({
                    where: { company_id: organizationId },
                    select: { id: true }
                });
                allowedLocationIds = companyStores.map(s => String(s.id));

                if (clientRequestedLoc) {
                    const reqLocStr = String(clientRequestedLoc).trim();
                    if (reqLocStr && reqLocStr !== 'undefined' && reqLocStr !== 'null') {
                        if (!allowedLocationIds.includes(reqLocStr)) {
                            console.warn(`[SSO DENIED] Corporate User ${userId} requested store ${reqLocStr} outside company ${organizationId}`);
                            return res.status(403).json({
                                error: 'PULSE_LOCATION_UNAUTHORIZED',
                                status: 'PULSE_LOCATION_UNAUTHORIZED',
                                message: 'Requested location does not belong to your organization.'
                            });
                        }
                        activeLocationId = reqLocStr;
                        primaryLocationId = reqLocStr;
                    }
                }
                if (!primaryLocationId) {
                    primaryLocationId = allowedLocationIds[0] || null;
                    activeLocationId = primaryLocationId;
                }
            }

            if (allowedLocationIds.length === 0 && user.propertyId) {
                allowedLocationIds = [String(user.propertyId)];
                primaryLocationId = String(user.propertyId);
            }

            const effectiveActiveLocationId = activeLocationId || primaryLocationId;

            // Expiration: 5 minutes (300 seconds)
            const expiresInSeconds = 300;
            const now = Math.floor(Date.now() / 1000);

            // Requirement 1 & 6: Cryptographically strong unique JTI per issued handoff
            const jti = randomUUID();

            // Construct Handoff Payload (No password, no secrets exposed, server-side signed)
            const handoffPayload = {
                iss: 'brasa-meat-intelligence',
                aud: 'brasa-brand-pulse',
                sub: userId,
                jti,
                userId,
                organizationId,
                allowedLocationIds,
                primaryLocationId: effectiveActiveLocationId,
                activeLocationId: effectiveActiveLocationId,
                role,
                isMaster: isMasterUser,
                globalScope: isMasterUser,
                email: user.email,
                iat: now,
                exp: now + expiresInSeconds
            };

            // Sign token server-side with HS256 HMAC using dedicated PULSE_SSO_SECRET
            const handoffToken = jwt.sign(handoffPayload, ssoSecret, { algorithm: 'HS256' });

            // Verify store_id exists if FK is present
            let validStoreId: number | undefined = undefined;
            if (primaryLocationId) {
                const parsed = parseInt(primaryLocationId, 10);
                if (!isNaN(parsed)) {
                    const exists = await prisma.store.findUnique({ where: { id: parsed }, select: { id: true } });
                    if (exists) validStoreId = parsed;
                }
            }

            // Requirement 8: Audit event logging (Safe metadata only, no raw token/secret)
            await prisma.auditLog.create({
                data: {
                    user_id: userId,
                    action: 'PULSE_SSO_HANDOFF_ISSUED',
                    resource: 'BRASA_BRAND_PULSE',
                    company_id: organizationId || undefined,
                    store_id: validStoreId,
                    ip_address: req.ip || req.socket.remoteAddress || 'unknown',
                    details: {
                        jti,
                        userId,
                        role,
                        organizationId,
                        primaryLocationId,
                        allowedLocationCount: allowedLocationIds.length,
                        issuedAt: new Date(now * 1000).toISOString(),
                        expiresAt: new Date((now + expiresInSeconds) * 1000).toISOString()
                    }
                }
            }).catch(e => console.warn('[Audit Log Write Notice]:', e.message));

            const isReceiverDisabled = process.env.BRAND_PULSE_DISABLED === 'true';
            const ssoReceiverUrl = `${pulseBaseUrl}/api/auth/brasa-meat-sso?token=${handoffToken}`;

            return res.json({
                success: true,
                status: isReceiverDisabled ? 'PULSE_SSO_DISABLED' : 'PULSE_SSO_READY',
                message: isReceiverDisabled
                    ? 'PULSE_SSO_DISABLED: Brand Pulse SSO is temporarily disabled.'
                    : 'Secure handoff token with JTI generated for BRASA Pulse.',
                handoff: {
                    jti,
                    userId,
                    organizationId,
                    allowedLocationIds,
                    primaryLocationId,
                    role,
                    email: user.email,
                    expiresAt: now + expiresInSeconds,
                    expiresInSeconds
                },
                handoffToken,
                destinationUrl: pulseBaseUrl,
                fullRedirectUrl: ssoReceiverUrl
            });

        } catch (error: any) {
            console.error('[Pulse Handoff Error]:', error);
            return res.status(500).json({
                error: 'Failed to generate BRASA Pulse handoff token',
                details: error.message
            });
        }
    }

    /**
     * GET /api/auth/brasa-meat-sso
     * Browser GET endpoint for BRASA Pulse SSO Handoff Redirect.
     * Verifies the handoff token and redirects the browser seamlessly to the Pulse Dashboard.
     */
    static async handleBrowserSso(req: Request, res: Response) {
        try {
            const token = (req.query.token || req.body?.token) as string;

            if (!token) {
                return res.status(400).json({
                    error: 'PULSE_SSO_INVALID_TOKEN',
                    message: 'No handoff token provided in redirect query.'
                });
            }

            const ssoSecret = process.env.PULSE_SSO_SECRET;
            if (!ssoSecret) {
                return res.status(500).json({
                    error: 'PULSE_SSO_NOT_CONFIGURED',
                    message: 'Dedicated SSO secret is not configured on server.'
                });
            }

            const payload = jwt.verify(token, ssoSecret) as any;

            if (payload.iss !== 'brasa-meat-intelligence' || payload.aud !== 'brasa-brand-pulse') {
                return res.status(401).json({
                    error: 'PULSE_SSO_INVALID_TOKEN',
                    message: 'Invalid JWT issuer or audience.'
                });
            }

            // Resolve dedicated Brand Pulse application receiver URL
            const brandPulseAppUrl = process.env.BRAND_PULSE_APP_URL || process.env.BRAND_PULSE_URL;

            if (brandPulseAppUrl && !brandPulseAppUrl.includes(req.hostname)) {
                const redirectTarget = `${brandPulseAppUrl}/api/auth/brasa-meat-sso?token=${token}`;
                return res.redirect(302, redirectTarget);
            }

            return res.status(500).json({
                error: 'PULSE_SSO_RECEIVER_NOT_HOSTED_HERE',
                message: 'Brand Pulse SSO receiver is hosted on the Brand Pulse application (pulse.brasameat.com).'
            });
        } catch (err: any) {
            console.error('[SSO Browser Redirect Error]:', err.message);
            return res.status(401).json({
                error: 'PULSE_SSO_VERIFICATION_FAILED',
                message: err.message || 'Failed to verify handoff token.'
            });
        }
    }

    /**
     * GET /api/v1/pulse/entitlement/status
     * Returns BRASA_PULSE entitlement status for current session organization.
     */
    static async getEntitlementStatus(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const reqCompanyHeader = (req.headers['x-company-id'] || req.query.companyId || req.body?.companyId) as string | undefined;

            let organizationId: string | null = null;

            if (reqCompanyHeader && String(reqCompanyHeader).trim() !== '' && String(reqCompanyHeader) !== 'undefined' && String(reqCompanyHeader) !== 'null') {
                organizationId = String(reqCompanyHeader).trim();
            } else if (user?.companyId || user?.company_id) {
                const compStr = String(user.companyId || user.company_id).trim();
                if (compStr !== 'null' && compStr !== 'undefined') {
                    organizationId = compStr;
                }
            }

            if (!organizationId) {
                organizationId = 'tdb-main';
            }

            const entitlement = await prisma.organizationProductEntitlement.findUnique({
                where: {
                    company_id_product_code: {
                        company_id: organizationId,
                        product_code: 'BRASA_PULSE'
                    }
                }
            });

            const entitled = !!(entitlement && entitlement.status === 'ACTIVE');
            return res.json({
                entitled,
                status: entitlement ? entitlement.status : 'INACTIVE',
                productCode: 'BRASA_PULSE',
                organizationId
            });
        } catch (err: any) {
            console.error('Fetch entitlement status error:', err);
            return res.status(500).json({ error: 'Failed to fetch entitlement status' });
        }
    }

    /**
     * POST /api/v1/pulse/entitlement/toggle
     * Admin-only endpoint to enable or disable BRASA Pulse entitlement for a client organization (Requirement 12).
     */
    static async toggleEntitlement(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Role Protection: Admin / Director / Master only (GMs cannot toggle entitlements)
            const isMaster = user.email?.toLowerCase().includes('alexandre@alexgarciaventures.co');
            const isAdmin = user.role === 'admin' || user.role === 'director' || isMaster;
            if (!isAdmin) {
                return res.status(403).json({ error: 'Forbidden: Admin authorization required' });
            }

            const { companyId, enabled } = req.body;
            if (!companyId || typeof enabled !== 'boolean') {
                return res.status(400).json({ error: 'Invalid payload: companyId (string) and enabled (boolean) required' });
            }

            const newStatus = enabled ? 'ACTIVE' : 'INACTIVE';
            const source = 'ADMIN_TOGGLE';

            const entitlement = await prisma.organizationProductEntitlement.upsert({
                where: {
                    company_id_product_code: {
                        company_id: companyId,
                        product_code: 'BRASA_PULSE'
                    }
                },
                create: {
                    company_id: companyId,
                    product_code: 'BRASA_PULSE',
                    status: newStatus,
                    enabled_by: String(user.id),
                    disabled_at: enabled ? null : new Date(),
                    source,
                    notes: `Toggled via Admin API by ${user.email}`
                },
                update: {
                    status: newStatus,
                    enabled_by: String(user.id),
                    disabled_at: enabled ? null : new Date(),
                    source,
                    notes: `Toggled via Admin API by ${user.email}`,
                    updated_at: new Date()
                }
            });

            // Requirement 19: Audit Logging
            const action = enabled ? 'PULSE_ENTITLEMENT_ENABLED' : 'PULSE_ENTITLEMENT_DISABLED';
            await prisma.auditLog.create({
                data: {
                    user_id: String(user.id),
                    action,
                    resource: 'ORGANIZATION_PRODUCT_ENTITLEMENT',
                    company_id: companyId,
                    details: {
                        productCode: 'BRASA_PULSE',
                        previousStatus: enabled ? 'INACTIVE' : 'ACTIVE',
                        newStatus,
                        actedBy: user.email,
                        timestamp: new Date().toISOString()
                    }
                }
            }).catch(e => console.warn('Audit log write error:', e.message));

            return res.json({
                success: true,
                message: `BRASA Pulse entitlement ${newStatus} for company ${companyId}`,
                entitlement
            });
        } catch (err: any) {
            console.error('Toggle entitlement error:', err);
            return res.status(500).json({ error: 'Failed to update entitlement', details: err.message });
        }
    }

    /**
     * GET /api/v1/pulse/master-manifest (and /api/v1/ecosystem/master-locations)
     * PHASE 7B-5L — Master Location Manifest Export Contract
     * Authenticated endpoint providing authoritative organization & store identity metadata for Pulse/Ecosystem provisioning.
     * ZERO guessing: Returns exact Meat database store_id as brasaLocationId.
     * No credentials or sensitive business metrics exposed.
     */
    static async getMasterManifest(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized: Session missing' });
            }

            const { organizationId, companyId, subdomain } = req.query;

            // Target organization resolution
            let targetOrgId = (organizationId || companyId) as string | undefined;

            if (!targetOrgId && subdomain) {
                const company = await prisma.company.findFirst({
                    where: { subdomain: String(subdomain).toLowerCase() },
                    select: { id: true }
                });
                if (company) targetOrgId = company.id;
            }

            // Fallback to authenticated user's organization
            if (!targetOrgId) {
                targetOrgId = user.companyId || user.company_id;
            }

            // Master fallback if still null
            if (!targetOrgId) {
                const fogoCompany = await prisma.company.findFirst({
                    where: { name: { contains: 'Fogo', mode: 'insensitive' } },
                    select: { id: true }
                });
                if (fogoCompany) targetOrgId = fogoCompany.id;
            }

            if (!targetOrgId) {
                return res.status(400).json({ error: 'Target organization required' });
            }

            // Access control: User must belong to organization or be admin/master
            const isMaster = user.email?.toLowerCase().includes('alexandre@alexgarciaventures.co');
            const isAdmin = user.role === 'admin' || user.role === 'partner' || isMaster;
            const userCompanyId = user.companyId || user.company_id;

            if (!isAdmin && userCompanyId && userCompanyId !== targetOrgId) {
                return res.status(403).json({ error: 'Forbidden: Access denied for requested organization' });
            }

            // Fetch Organization Master Data
            const company = await prisma.company.findUnique({
                where: { id: targetOrgId },
                select: {
                    id: true,
                    name: true,
                    subdomain: true,
                    company_status: true,
                    entitlements: {
                        where: { product_code: 'BRASA_PULSE' },
                        select: { status: true }
                    }
                }
            });

            if (!company) {
                return res.status(404).json({ error: 'Organization not found' });
            }

            // Fetch all Stores for Organization
            const stores = await prisma.store.findMany({
                where: { company_id: company.id },
                orderBy: { id: 'asc' }
            });

            const pulseEntitlement = company.entitlements?.[0]?.status === 'ACTIVE';

            // Identity processing & quality classification (Phase 7B-5O semantics)
            const locations = stores.map((store, idx) => {
                const isComplete = Boolean(store.id && store.company_id && store.store_name && (store.location || store.city));
                const isNaples = store.store_name.toLowerCase().includes('naples') || store.id === 1132;
                const isComingSoon = isNaples || store.status === 'INACTIVE';

                const provisionalAlias = `fogo_${idx + 1}`;

                return {
                    brasaLocationId: String(store.id),
                    store_id: store.id,
                    provisionalAlias,
                    name: store.store_name,
                    brand: company.name,
                    address_line1: store.location || null,
                    address_line2: null,
                    city: store.city || (isNaples ? 'Naples' : null),
                    state: store.location || (isNaples ? 'Florida' : null),
                    postal_code: null,
                    country: store.country || 'USA',
                    timezone: store.timezone || 'America/Chicago',
                    latitude: null,
                    longitude: null,
                    status: store.status,
                    dataType: store.data_type,
                    active: !isComingSoon,
                    operatingStatus: isComingSoon ? 'COMING_SOON' : 'OPERATIONAL',
                    masterIdentityStatus: isComingSoon ? 'MASTER_PENDING_VERIFICATION' : 'MASTER_PROVISIONAL',
                    physicalIdentityStatus: isComingSoon ? 'PENDING' : 'VERIFIED',
                    canProvisionDownstream: !isComingSoon,
                    canonicalMasterVerified: false,
                    provenance: isComingSoon ? 'PENDING_VERIFICATION_FIXTURE' : 'SEED_FIXTURE_DERIVED',
                    identityQuality: isComplete ? 'MASTER_IDENTITY_COMPLETE' : 'MASTER_IDENTITY_PARTIAL'
                };
            });

            // Duplicate checks
            const storeIds = stores.map(s => s.id);
            const uniqueStoreIds = new Set(storeIds);
            const duplicateIdCount = storeIds.length - uniqueStoreIds.size;

            const names = stores.map(s => s.store_name.toLowerCase().trim());
            const uniqueNames = new Set(names);
            const duplicatePhysicalCount = names.length - uniqueNames.size;

            const physicalVerifiedOperational = locations.filter(l => l.operatingStatus === 'OPERATIONAL' && l.physicalIdentityStatus === 'VERIFIED').length;
            const comingSoon = locations.filter(l => l.operatingStatus === 'COMING_SOON').length;
            const masterVerified = locations.filter(l => l.canonicalMasterVerified).length;
            const masterProvisional = locations.filter(l => l.masterIdentityStatus === 'MASTER_PROVISIONAL').length;
            const masterPending = locations.filter(l => l.masterIdentityStatus === 'MASTER_PENDING_VERIFICATION').length;
            const syntheticProvisionalIds = locations.length; // All 86 current IDs are fixture-derived

            const locationsPayloadStr = JSON.stringify(locations);
            const manifestHash = createHash('sha256').update(locationsPayloadStr).digest('hex');

            const manifest = {
                schemaVersion: '1.0',
                generatedAt: new Date().toISOString(),
                source: 'BRASA_MEAT_MASTER_IDENTITY',
                masterIdentityTrust: 'PARTIAL',
                manifestHash,
                organization: {
                    brasaOrganizationId: company.id,
                    name: company.name,
                    subdomain: company.subdomain || null,
                    active: company.company_status !== 'DELETED' && company.company_status !== 'INACTIVE',
                    masterIdentityStatus: 'MASTER_PROVISIONAL',
                    provenance: 'TENANT_PROVISIONING_FIXTURE',
                    pulseEntitlementActive: pulseEntitlement,
                    totalStores: stores.length,
                    activeStores: physicalVerifiedOperational
                },
                summary: {
                    physicalRecordsTotal: stores.length,
                    physicalVerifiedOperational,
                    comingSoon,
                    masterVerified,
                    masterProvisional,
                    masterPending,
                    syntheticProvisionalIds,
                    duplicateIdCount,
                    duplicatePhysicalCount
                },
                remappingContract: {
                    remappingSupported: true,
                    aliasHistorySupported: true,
                    preservesInternalPK: true,
                    preservesUserAssignments: true,
                    remappingStrategy: 'UPDATE_PRIMARY_KEY_ALIAS_MAPPING_NON_DESTRUCTIVE'
                },
                locations
            };

            return res.json(manifest);
        } catch (err: any) {
            console.error('Failed to generate master location manifest:', err);
            return res.status(500).json({ error: 'Internal server error', details: err.message });
        }
    }
}
