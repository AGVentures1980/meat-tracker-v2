import { Request, Response, NextFunction } from 'express';
import { SentinelService } from '../services/SentinelService';

export const securityMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const isProxyOrInternal = !clientIp || clientIp === 'unknown' || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.startsWith('10.') || clientIp.startsWith('172.') || clientIp.startsWith('192.168.');

    if (!isProxyOrInternal && SentinelService.isBlocked(clientIp)) {
        console.warn(`⛔ [SECURITY] Blocked request from ${clientIp}`);
        return res.status(403).json({
            success: false,
            error: 'Security Lockdown: Too many failed attempts. Please try again in 5 minutes.'
        });
    }

    next();
};
