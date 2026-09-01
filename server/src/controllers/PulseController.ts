import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PULSE_SSO_SECRET = process.env.PULSE_SSO_SECRET || process.env.JWT_SECRET || 'brasa-pulse-sso-secret-key-change-me';
const BRAND_PULSE_URL = process.env.BRAND_PULSE_URL || 'https://pulse.brasameat.com';

export class PulseController {
    /**
     * POST /api/v1/pulse/handoff (and /api/v1/auth/pulse-handoff)
     * Generates a short-lived (5 min), cryptographically signed Handoff Token for BRASA Pulse.
     * Derived strictly from authenticated session context (Zero-Trust).
     */
    static async generateHandoff(req: Request, res: Response) {
        try {
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

            // Construct Handoff Payload (No password, no secrets exposed, server-side signed)
            const handoffPayload = {
                iss: 'brasa-meat-intelligence',
                aud: 'brasa-brand-pulse',
                sub: userId,
                userId,
                organizationId,
                allowedLocationIds,
                primaryLocationId,
                role,
                email: user.email,
                iat: now,
                exp: now + expiresInSeconds
            };

            // Sign token server-side with HS256 HMAC
            const handoffToken = jwt.sign(handoffPayload, PULSE_SSO_SECRET, { algorithm: 'HS256' });

            const isReceiverConnected = process.env.BRAND_PULSE_CONNECTED === 'true';

            return res.json({
                success: true,
                status: isReceiverConnected ? 'PULSE_SSO_READY' : 'PULSE_SSO_NOT_CONNECTED',
                message: isReceiverConnected
                    ? 'Secure handoff token generated for BRASA Pulse.'
                    : 'PULSE_SSO_NOT_CONNECTED: BRASA Meat handoff token generated successfully. BRASA Pulse receiver module pending connection.',
                handoff: {
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
