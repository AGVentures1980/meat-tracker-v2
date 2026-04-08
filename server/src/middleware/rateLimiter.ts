import rateLimit, { MemoryStore } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { Request, Response, NextFunction } from 'express';

// Dummy Redis to avoid MaxRetriesPerRequestError
const redisClient = {
    on: () => {},
    get: async () => null,
    set: async () => {},
    incr: async () => 1,
    expire: async () => {}
} as any;

let isRedisHealthy = false;



const memoryLoginLimiter = rateLimit({
    store: new MemoryStore(),
    windowMs: 15 * 60 * 1000, 
    max: 10,
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const loginRateLimiter = (req: Request, res: Response, next: NextFunction) => {
    return memoryLoginLimiter(req, res, next);
};

const memoryApiLimiter = rateLimit({
    store: new MemoryStore(),
    windowMs: 1 * 60 * 1000, 
    max: 120, 
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const apiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
    return memoryApiLimiter(req, res, next);
};
