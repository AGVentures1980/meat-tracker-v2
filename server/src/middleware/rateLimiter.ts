import rateLimit, { MemoryStore } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { Request, Response, NextFunction } from 'express';

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

let isRedisHealthy = false;

redisClient.on('error', (err) => {
    console.error('[AUTH DEGRADATION] Redis Client Error in RateLimiter:', err.message);
    isRedisHealthy = false;
});
redisClient.on('connect', () => {
    console.log('Redis connected for Rate Limiting');
    isRedisHealthy = true;
});

// Configure base limiters for both contexts
const redisLoginLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
    }),
    windowMs: 15 * 60 * 1000, 
    max: 10,
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const memoryLoginLimiter = rateLimit({
    store: new MemoryStore(),
    windowMs: 15 * 60 * 1000, 
    max: 10,
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Create Dynamic Wrappers that conditionally route traffic
export const loginRateLimiter = (req: Request, res: Response, next: NextFunction) => {
    if (isRedisHealthy) {
        return redisLoginLimiter(req, res, next);
    } else {
        return memoryLoginLimiter(req, res, next);
    }
};

const redisApiLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
    }),
    windowMs: 1 * 60 * 1000, 
    max: 120, 
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const memoryApiLimiter = rateLimit({
    store: new MemoryStore(),
    windowMs: 1 * 60 * 1000, 
    max: 120, 
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const apiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
    if (isRedisHealthy) {
        return redisApiLimiter(req, res, next);
    } else {
        return memoryApiLimiter(req, res, next);
    }
};
