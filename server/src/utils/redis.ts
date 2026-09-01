import Redis from 'ioredis';

const isProd = process.env.NODE_ENV === 'production';
export const hasRedis = !!process.env.REDIS_URL;

if (isProd && !hasRedis) {
    console.error('CRITICAL: Redis Connection Missing in Production Context. Queue-dependent features cannot start.');
    process.exit(1); // Fail loud in production
}

let redisConnection: Redis | null = null;

if (hasRedis) {
    try {
        redisConnection = new Redis(process.env.REDIS_URL as string, {
            maxRetriesPerRequest: null // Required by BullMQ
        });
        redisConnection.on('error', (err) => {
            console.error('[Redis Error]', err.message);
        });
    } catch (err: any) {
        console.error('Failed to initialize Redis connection:', err.message);
        if (isProd) {
            process.exit(1);
        }
    }
} else {
    console.log('[Redis] Running in Mock mode (Local Development)');
}

export { redisConnection };
