import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'brasa-secret-key-change-me';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
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
        const decoded = jwt.verify(token, JWT_SECRET);
        (req as any).user = decoded;
        next();
    } catch (error) {
        console.error('JWT Verify Error:', error);
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
