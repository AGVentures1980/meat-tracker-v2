import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'brasa-secret-key-change-me';

import { getScopedPrisma } from '../config/scopedPrisma';
import { probingDetector } from '../utils/probingDetector';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (probingDetector.isBlocked('unknown', ip)) {
        return res.status(429).json({ error: 'Too many unauthorized attempts. IP Blocked.' });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        console.warn('Auth Error: No Authorization header provided');
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        console.warn('Auth Error: Token missing from header', authHeader);
        return res.status(401).json({ error: 'Token format invalid' });
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

            // ZERO TRUST: Enforce companyId exclusively from JWT Truth (calculated at Login), NOT headers
            // Only GLOBAL admins can override the tenant boundary context.
            const requestedCompanyId = req.headers['x-company-id'];
            if (requestedCompanyId && typeof requestedCompanyId === 'string') {
                if (decoded.scope && (decoded.scope.type === 'GLOBAL' || decoded.scope.type === 'PARTNER')) {
                    decoded.companyId = requestedCompanyId; // Authorized override
                } else if (requestedCompanyId !== decoded.companyId) {
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
        
        next();
    } catch (error) {
        console.error('JWT Verify Error:', error);
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        probingDetector.trackAttempt('unknown', ip, req.originalUrl);
        return res.status(401).json({ error: 'Invalid token', details: (error as any).message });
    }
};

/**
 * Role-Based Access Control Middleware
 * @param allowedRoles Array of roles that can access this route
 */
export const requireRole = (allowedRoles: Role[]) => {
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
