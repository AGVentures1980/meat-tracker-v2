import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'brasa-secret-key-change-me';

import { getScopedPrisma } from '../config/scopedPrisma';
import { probingDetector } from '../utils/probingDetector';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function parseCookies(cookieHeader?: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
            cookies[key] = decodeURIComponent(val);
        }
    });
    return cookies;
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Support both Authorization: Bearer <token> header and HttpOnly cookie
    let token: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else {
        const cookies = (req as any).cookies || parseCookies(req.headers.cookie);
        if (cookies && cookies['brasameat_token']) {
            token = cookies['brasameat_token'];
        }
    }

    if (!token) {
        console.warn('Auth Error: No Authorization header or cookie provided');
        probingDetector.trackAttempt('unknown', ip, req.originalUrl);
        if (probingDetector.isBlocked('unknown', ip)) {
            return res.status(429).json({ error: 'Too many unauthorized attempts. IP Blocked.' });
        }
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        // Enterprise Revocation Check & Zero-Trust Tenant Extraction
        if (decoded.id && decoded.tv) {
            const userCheck = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { token_version: true }
            });

            if (!userCheck || userCheck.token_version !== decoded.tv) {
                return res.status(401).json({ error: 'Session revoked. Please login again.' });
            }

            // ZERO TRUST & HOSTNAME AUTHORITY ENFORCEMENT
            const hostHeader = String(req.headers['x-forwarded-host'] || req.headers.host || req.hostname || '').split(',')[0].trim();
            const rawHost = hostHeader.split(':')[0].toLowerCase();
            let subdomain = rawHost.split('.')[0].toLowerCase();
            if (subdomain === 'fdc') subdomain = 'fogo';

            let hostnameTenantId: string | null = null;
            const isNonTenantHost = !subdomain || ['www', 'localhost', 'brasameat', 'meat-tracker-v2', 'meat-intelligence', 'meat-intelligence-final'].includes(subdomain) || subdomain.includes('railway');

            if (!isNonTenantHost) {
                // P2: STRICT CANONICAL SUBDOMAIN LOOKUP ONLY (NO company.name fallback!)
                const tenantCo = await prisma.company.findFirst({
                    where: { subdomain: subdomain },
                    select: { id: true, subdomain: true }
                });
                if (tenantCo) {
                    hostnameTenantId = tenantCo.id;
                }
            }

            const isPlatformRoute = req.originalUrl.startsWith('/api/v1/platform') || req.path.startsWith('/platform');
            const requestedCompanyId = req.headers['x-company-id'];
            const hasHeaderCompany = requestedCompanyId && typeof requestedCompanyId === 'string' && requestedCompanyId !== 'null' && requestedCompanyId !== 'undefined' && requestedCompanyId.trim().length > 0;

            if (hostnameTenantId && !isPlatformRoute) {
                // P1: TENANT HOSTNAME IS AUTHORITATIVE ON TENANT ROUTES
                if (hasHeaderCompany && String(requestedCompanyId) !== String(hostnameTenantId)) {
                    console.warn(`[SECURITY] Tenant context mismatch: Header x-company-id (${requestedCompanyId}) contradicts Host (${rawHost} -> ${hostnameTenantId})`);
                    return res.status(409).json({
                        error: 'TENANT_CONTEXT_MISMATCH',
                        message: 'Header x-company-id contradicts tenant hostname authority.'
                    });
                }

                if (decoded.scope && (decoded.scope.type === 'GLOBAL' || decoded.scope.type === 'PARTNER')) {
                    decoded.companyId = hostnameTenantId;
                } else {
                    if (String(decoded.companyId) !== String(hostnameTenantId)) {
                        console.warn(`[SECURITY] Tenant spoofing blocked: User ${decoded.id} (${decoded.companyId}) attempted access to hostname tenant ${hostnameTenantId}`);
                        return res.status(403).json({
                            error: 'TENANT_CONTEXT_MISMATCH',
                            message: 'User unauthorized for target hostname tenant.'
                        });
                    }
                    decoded.companyId = hostnameTenantId;
                }
            } else {
                // Global top-level domain or platform routes
                if (decoded.scope && (decoded.scope.type === 'GLOBAL' || decoded.scope.type === 'PARTNER')) {
                    if (hasHeaderCompany) {
                        decoded.companyId = requestedCompanyId;
                    }
                } else if (hasHeaderCompany && String(requestedCompanyId) !== String(decoded.companyId)) {
                    console.warn(`[SECURITY] Tenant spoofing blocked for user ${decoded.id}`);
                    return res.status(403).json({ error: 'Tenant spoofing detected and blocked.' });
                }
            }
        }

        // Normalize identity payload
        decoded.id = decoded.id ?? decoded.userId;
        decoded.userId = decoded.userId ?? decoded.id;

        (req as any).user = decoded;
        
        // ENTERPRISE HARDENING: Inject mathematically scoped Prisma Client
        if (process.env.ENABLE_SCOPED_PRISMA === 'true') {
            (req as any).scopedPrisma = getScopedPrisma(decoded);
        } else {
            (req as any).scopedPrisma = prisma;
        }
        // Clear rogue probing blocks once identity is confirmed
        probingDetector.clearTracking('unknown', ip);
        
        next();
    } catch (error) {
        console.error('JWT Verify Error:', error);
        probingDetector.trackAttempt('unknown', ip, req.originalUrl);
        if (probingDetector.isBlocked('unknown', ip)) {
            return res.status(429).json({ error: 'Too many unauthorized attempts. IP Blocked.' });
        }
        return res.status(401).json({ error: 'Invalid token', details: (error as any).message });
    }
};

/**
 * Role-Based Access Control Middleware
 * @param allowedRoles Array of roles that can access this route
 */
export const requireRole = (allowedRoles: string[] | readonly string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: Authentication required' });
        }


        if (!allowedRoles.includes(user.role)) {
            console.warn(`RBAC Denied: User ${user.email} (${user.role}) attempted to access restricted route.`);
            return res.status(403).json({
                error: 'Permission Denied',
                message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
            });
        }

        next();
    };
};

/**
 * Enterprise Scope-Based Access Control Middleware
 * @param allowedScopes Array of organizational scopes that can access this route
 */
export const requireScope = (requiredType: 'GLOBAL' | 'COMPANY' | 'AREA' | 'STORE') => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userId = user?.id || 'unknown';

        if (probingDetector.isBlocked(userId, ip)) {
            return res.status(429).json({ error: 'Too many unauthorized attempts. Blocked.' });
        }

        if (!user || !user.scope) {
            probingDetector.trackAttempt(userId, ip, req.originalUrl);
            return res.status(403).json({ error: 'Access Denied: Missing scope context' });
        }

        if (requiredType === 'GLOBAL') {
            if (user.scope.type !== 'GLOBAL' && user.scope.type !== 'PARTNER') {
                probingDetector.trackAttempt(userId, ip, req.originalUrl);
                return res.status(403).json({ error: 'Access Denied: Requires GLOBAL rights.' });
            }

            const auditReason = req.headers['x-audit-reason'];
            if (!auditReason || typeof auditReason !== 'string' || auditReason.trim().length === 0) {
                probingDetector.trackAttempt(userId, ip, req.originalUrl);
                return res.status(403).json({ error: 'Access Denied: X-Audit-Reason header is mandated for GLOBAL actions.' });
            }

            console.log(`[AUDIT: GLOBAL ACTION] User: ${user.email} - Action: ${req.method} ${req.url} - Reason: ${auditReason}`);
            return next();
        }

        const hierarchy = ['STORE', 'AREA', 'COMPANY', 'GLOBAL', 'PARTNER'];
        const userRank = hierarchy.indexOf(user.scope.type);
        const requiredRank = hierarchy.indexOf(requiredType);

        if (userRank < requiredRank) {
             probingDetector.trackAttempt(userId, ip, req.originalUrl);
             return res.status(403).json({ error: `Access Denied: Requires ${requiredType} scope minimum.` });
        }

        next();
    };
};
