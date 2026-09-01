import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const BRAND_PULSE_URL = process.env.BRAND_PULSE_URL || 'https://pulse.brasameat.com';

export class PulseController {
    /**
     * POST /api/v1/pulse/handoff (and /api/v1/auth/pulse-handoff)
     * Generates a short-lived (5 min), cryptographically signed Handoff Token for BRASA Pulse.
     * Contains cryptographically unique `jti` for replay protection.
     * Derived strictly from authenticated session context (Zero-Trust).
     */
    static async generateHandoff(req: Request, res: Response) {
        try {
            // Requirement 4: Dedicated SSO Secret ONLY (No generic JWT_SECRET fallback)
            const ssoSecret = process.env.PULSE_SSO_SECRET || (process.env.NODE_ENV === 'test' ? 'brasa-pulse-sso-secret-key-change-me' : null);
            if (!ssoSecret) {
                console.error('[SSO SENDER FAIL] Dedicated PULSE_SSO_SECRET is missing on sender.');
                return res.status(500).json({
                    error: 'PULSE_SSO_NOT_CONFIGURED',
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

            // Requirement 8: Audit event logging (Safe metadata only, no raw token/secret)
            await prisma.auditLog.create({
                data: {
                    user_id: userId,
                    action: 'PULSE_SSO_HANDOFF_ISSUED',
                    resource: 'BRASA_BRAND_PULSE',
                    company_id: organizationId || undefined,
                    store_id: primaryLocationId ? parseInt(primaryLocationId) || undefined : undefined,
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

            const isReceiverConnected = process.env.BRAND_PULSE_CONNECTED === 'true';

            return res.json({
                success: true,
                status: isReceiverConnected ? 'PULSE_SSO_READY' : 'PULSE_SSO_NOT_CONNECTED',
                message: isReceiverConnected
                    ? 'Secure handoff token with JTI generated for BRASA Pulse.'
                    : 'PULSE_SSO_NOT_CONNECTED: BRASA Meat handoff token generated successfully. BRASA Pulse receiver module pending connection.',
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
                destinationUrl: BRAND_PULSE_URL,
                fullRedirectUrl: `${BRAND_PULSE_URL}/sso/callback?token=${handoffToken}`
            });

        } catch (error: any) {
            console.error('[Pulse Handoff Error]:', error);
            return res.status(500).json({
                error: 'Failed to generate BRASA Pulse handoff token',
                details: error.message
            });
        }
    }
}
