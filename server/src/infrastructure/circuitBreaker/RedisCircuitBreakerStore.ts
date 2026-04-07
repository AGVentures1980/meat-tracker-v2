import Redis from 'ioredis';
import { emitMetric, emitStructuredLog, CircuitBreakerState, CircuitBreakerStore } from '../../utils/vaultMetrics';

// Reusable Redis instance (ensure connection polling handles scaling)
export const redisClient = process.env.REDIS_MOCK === 'true' 
    ? new (require('ioredis-mock'))()
    : (process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        connectTimeout: 2000,
        enableAutoPipelining: true 
    }) : new Redis({ host: 'localhost', port: 6379 }));

redisClient.on('error', (err: any) => {
    console.error('[Redis Error] Circuit Breaker fallback applied. Redis connection failed:', err.message);
});


/**
 * ATOMIC LUA TRANSITION SCRIPT
 * Guarantees no race conditions across backend instances modifying thresholds.
 */
const luaEvaluate = `
local key = KEYS[1]
local action = ARGV[1]
local threshold = tonumber(ARGV[2])
local maxRequests = tonumber(ARGV[3])
local cooldownMs = tonumber(ARGV[4])
local now = tonumber(ARGV[5])

local tripped = tonumber(redis.call('HGET', key, 'tripped') or '0')
local trippedAt = tonumber(redis.call('HGET', key, 'trippedAt') or '0')
local requests = tonumber(redis.call('HGET', key, 'requests') or '0')
local failures = tonumber(redis.call('HGET', key, 'failures') or '0')

if tripped == 1 then
    if (now - trippedAt) > cooldownMs then
        -- Cooldown elapsed. Half-open state resets failure limits.
        tripped = 0
        requests = 1
        failures = 0
        trippedAt = 0
        redis.call('HMSET', key, 'tripped', '0', 'requests', '1', 'failures', '0', 'trippedAt', '0')
    else
        -- Active Flapping Preventer: Extend cooldown if a failure occurs while leaking or locked
        if action == 'failure' then
            redis.call('HSET', key, 'trippedAt', now)
            trippedAt = now
        end
        redis.call('EXPIRE', key, 600)
        return { requests, failures, tripped, trippedAt }
    end
end

if action == 'request' then
    requests = redis.call('HINCRBY', key, 'requests', 1)
elseif action == 'failure' then
    requests = redis.call('HINCRBY', key, 'requests', 1)
    failures = redis.call('HINCRBY', key, 'failures', 1)
    
    if requests > maxRequests then
        local failureRate = failures / requests
        if failureRate > threshold then
            tripped = 1
            trippedAt = now
            redis.call('HMSET', key, 'tripped', '1', 'trippedAt', now)
        end
    end
end

redis.call('EXPIRE', key, 600) -- TTL: 10 minutes inactivity
return { requests, failures, tripped, trippedAt }
`;

// Register the Lua script in ioredis
redisClient.defineCommand('evaluateCircuit', {
    numberOfKeys: 1,
    lua: luaEvaluate
});

export class RedisCircuitBreakerStore extends CircuitBreakerStore {
    // SYNC FAST PATH: Local Memory Cache layer to avoid Redis roundtrips on every request
    private localCache = new Map<string, { state: CircuitBreakerState; expiresAt: number }>();
    
    // Configs
    private readonly CACHE_TTL_MS = 2000;
    private readonly COOLDOWN_MS = 300000;
    private readonly FAILURE_THRESHOLD = 0.03;

    private getKey(companyId: string) {
        return `cb:${companyId}`;
    }

    private updateLocalCache(companyId: string, state: CircuitBreakerState) {
        this.localCache.set(companyId, { state, expiresAt: Date.now() + this.CACHE_TTL_MS });
    }

    async getState(companyId: string): Promise<CircuitBreakerState> {
        try {
            const data = await redisClient.hgetall(this.getKey(companyId));
            if (!data || Object.keys(data).length === 0) {
                return { requests: 0, failures: 0, tripped: false };
            }
            return {
                requests: parseInt(data.requests || '0', 10),
                failures: parseInt(data.failures || '0', 10),
                tripped: data.tripped === '1',
                trippedAt: data.trippedAt ? parseInt(data.trippedAt, 10) : undefined
            };
        } catch (error: any) {
            this.handleFailSafe(companyId, error);
            // FAIL SAFE fallback
            const failsafeVal = process.env.CB_FAILSAFE_MODE === 'SHADOW' ? false : true;
            return { requests: 0, failures: 0, tripped: failsafeVal };
        }
    }

    getSyncState(companyId: string): CircuitBreakerState {
        // Fast-path synchronization preventing event loop lag
        const cached = this.localCache.get(companyId);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.state;
        }

        // Extremely low latency penalty handling synchronous checks natively. 
        // We'll kick off a background refresh asynchronously to ensure subsequent requests hit cache.
        this.backgroundRefresh(companyId).catch(() => {});
        
        // Return latest memory or safe baseline until async hydrates.
        return cached ? cached.state : { requests: 0, failures: 0, tripped: false };
    }

    private async backgroundRefresh(companyId: string) {
        const freshState = await this.getState(companyId);
        this.updateLocalCache(companyId, freshState);
    }

    async saveState(companyId: string, state: CircuitBreakerState): Promise<void> {
        // Obsolete in Lua logic, but keeping interface compliant
        this.updateLocalCache(companyId, state);
    }

    async incrementRequest(companyId: string): Promise<void> {
        await this.executeLua(companyId, 'request');
    }

    async incrementFailure(companyId: string): Promise<void> {
        await this.executeLua(companyId, 'failure');
    }

    async reset(companyId: string): Promise<void> {
        try {
            await redisClient.del(this.getKey(companyId));
            this.updateLocalCache(companyId, { requests: 0, failures: 0, tripped: false });
        } catch (error: any) {
            this.handleFailSafe(companyId, error);
        }
    }

    private async executeLua(companyId: string, action: 'request' | 'failure') {
        try {
            // @ts-ignore
            const result: number[] = await redisClient.evaluateCircuit(
                this.getKey(companyId), 
                action, 
                this.FAILURE_THRESHOLD.toString(), 
                '20', 
                this.COOLDOWN_MS.toString(), 
                Date.now().toString()
            );

            // [requests, failures, tripped, trippedAt]
            const state: CircuitBreakerState = {
                requests: result[0],
                failures: result[1],
                tripped: result[2] === 1,
                trippedAt: result[3] === 0 ? undefined : result[3]
            };

            // Detect trips or recoveries for telemetry
            const oldCache = this.localCache.get(companyId)?.state;
            if (oldCache && !oldCache.tripped && state.tripped) {
                 emitStructuredLog({ metric: 'circuit_breaker_tripped', companyId, status: 503, error: `Failure Rate limit breached. Tenant enforcement suspended.` });
                 emitMetric({ metric: 'cb_tripped', companyId, endpoint: 'redis', status: 503 });
            } else if (oldCache && oldCache.tripped && !state.tripped) {
                 emitStructuredLog({ metric: 'circuit_breaker_recovered', companyId, status: 200, error: `Cooldown expired. Restoring Enforcement.` });
                 emitMetric({ metric: 'cb_recovered', companyId, endpoint: 'redis', status: 200 });
            }

            if (action === 'request') {
                 emitMetric({ metric: 'cb_request', companyId, endpoint: 'redis', status: 200 });
            } else {
                 emitMetric({ metric: 'cb_failure', companyId, endpoint: 'redis', status: 500 });
            }

            // Immediately invalidate/update cache ensuring sync fast-path honors exact state
            this.updateLocalCache(companyId, state);
        } catch (error: any) {
            this.handleFailSafe(companyId, error);
        }
    }

    private handleFailSafe(companyId: string, error: any) {
        emitStructuredLog({
            metric: 'redis_store_failure',
            companyId,
            error: error?.message || 'Redis connection failed',
            status: 500
        });

        // Fail closed or shadow depending on environment limits natively blocking cross-tenant breaches.
        const fallbackTripped = process.env.CB_FAILSAFE_MODE === 'SHADOW' ? false : true;
        this.updateLocalCache(companyId, { requests: 0, failures: 0, tripped: fallbackTripped, trippedAt: Date.now() });
    }
}
