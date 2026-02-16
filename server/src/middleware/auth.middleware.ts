import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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
        // console.log('Auth Success:', (decoded as any).email);
        (req as any).user = decoded;
        next();
    } catch (error) {
        console.error('JWT Verify Error:', error);
        console.error('Failed Token:', token.substring(0, 20) + '...');
        return res.status(401).json({ error: 'Invalid token', details: (error as any).message });
    }
};
