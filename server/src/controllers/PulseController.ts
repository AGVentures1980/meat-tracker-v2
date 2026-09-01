import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

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

            // Requirement 4: Dedicated SSO Secret ONLY (No generic JWT_SECRET fallback)
            const ssoSecret = process.env.PULSE_SSO_SECRET || (process.env.NODE_ENV === 'test' ? 'brasa-pulse-sso-secret-key-change-me' : null);
            if (!ssoSecret) {
                console.error('[SSO SENDER FAIL] Dedicated PULSE_SSO_SECRET is missing on sender.');
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
            const organizationId = user.companyId || user.company_id ? String(user.companyId || user.company_id) : null;
            const role = String(user.role || 'viewer');

            // ─── REQUIREMENT 8: SERVER-SIDE PRODUCT ENTITLEMENT ENFORCEMENT ──────
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

            // ─── DERIVE LOCATION SCOPE SERVER-SIDE (ZERO TRUST) ───────────────────
            let allowedLocationIds: string[] = [];
            let primaryLocationId: string | null = null;

            // Scenario A: General Manager / Single Store User
            if (user.store_id || user.storeId) {
                const storeIdStr = String(user.store_id || user.storeId);
                allowedLocationIds = [storeIdStr];
                primaryLocationId = storeIdStr;
            }
            // Scenario B: Area Manager
            else if (role === 'area_manager' || (user.scope && user.scope.type === 'AREA')) {
                const areaStores = await prisma.store.findMany({
                    where: { area_manager_id: userId },
                    select: { id: true }
                });
                if (areaStores.length > 0) {
                    allowedLocationIds = areaStores.map(s => String(s.id));
                    primaryLocationId = allowedLocationIds[0];
                } else if (user.scope?.storeIds && Array.isArray(user.scope.storeIds)) {
                    allowedLocationIds = user.scope.storeIds.map((id: any) => String(id));
                    primaryLocationId = allowedLocationIds[0] || null;
                }
            }
            // Scenario C: Corporate / Director / Regional / Admin / Global
            else if (organizationId) {
                const companyStores = await prisma.store.findMany({
                    where: { company_id: organizationId },
                    select: { id: true }
                });
                allowedLocationIds = companyStores.map(s => String(s.id));
                primaryLocationId = allowedLocationIds[0] || null;
            }

            // Fallback: If user has property_id or outletIds in session
            if (allowedLocationIds.length === 0 && user.propertyId) {
                allowedLocationIds = [String(user.propertyId)];
                primaryLocationId = String(user.propertyId);
            }

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
                primaryLocationId,
                role,
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
     * GET /api/v1/pulse/entitlement/status
     * Returns BRASA_PULSE entitlement status for current session organization.
     */
    static async getEntitlementStatus(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const organizationId = user?.companyId || user?.company_id || req.headers['x-company-id'];
            if (!organizationId) {
                return res.json({ entitled: false, status: 'NO_ORGANIZATION_CONTEXT' });
            }

            const entitlement = await prisma.organizationProductEntitlement.findUnique({
                where: {
                    company_id_product_code: {
                        company_id: String(organizationId),
                        product_code: 'BRASA_PULSE'
                    }
                }
            });

            const entitled = !!(entitlement && entitlement.status === 'ACTIVE');
            return res.json({
                entitled,
                status: entitlement ? entitlement.status : 'INACTIVE',
                productCode: 'BRASA_PULSE'
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
}
