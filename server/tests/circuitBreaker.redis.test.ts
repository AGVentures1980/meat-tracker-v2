import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { RedisCircuitBreakerStore, redisClient } from '../src/infrastructure/circuitBreaker/RedisCircuitBreakerStore';
import { emitMetric, emitStructuredLog } from '../src/utils/vaultMetrics';

jest.mock('ioredis', () => {
    return require('ioredis-mock');
});

// Suppress logs in testing
jest.mock('../src/utils/vaultMetrics', () => {
    const original = jest.requireActual('../src/utils/vaultMetrics') as any;
    return {
        ...original,
        emitMetric: jest.fn(),
        emitStructuredLog: jest.fn()
    };
});

describe('Distributed Redis Circuit Breaker Implementation', () => {
    let store: RedisCircuitBreakerStore;
    const companyId = 'test-company-123';

    beforeAll(() => {
         store = new RedisCircuitBreakerStore();
    });

    beforeEach(async () => {
        await store.reset(companyId);
        jest.clearAllMocks();
    });

    afterAll(async () => {
         await redisClient.quit();
    });

    it('1. Safe Transition: Tracks successful metrics transparently into cache', async () => {
        await store.incrementRequest(companyId);
        await store.incrementRequest(companyId);
        
        const state = await store.getState(companyId);
        expect(state.requests).toBe(2);
        expect(state.failures).toBe(0);
        expect(state.tripped).toBe(false);

        // SYNC CACHE verify
        const cached = store.getSyncState(companyId);
        expect(cached.requests).toBe(2);
    });

    it('2. Circuit Trip (Lua Atomic Guard): Trips exactly at threshold bound crossing', async () => {
         // Setup boundary logic to trip at 3% Failure across > 20 req max
         for(let i=0; i<19; i++) {
             await store.incrementRequest(companyId);
         }
         await store.incrementFailure(companyId); // Request 20, 1 failure (5%) - Shouldn't break yet, hits threshold eval safely.
         
         let state = await store.getState(companyId);
         expect(state.tripped).toBe(false);

         await store.incrementFailure(companyId); // Request 21, 2 failures (>3%) -> BOOM
         state = await store.getState(companyId);

         expect(state.tripped).toBe(true);
         expect(state.trippedAt).toBeDefined();

         // Validation telemetry emitted correctly matching structure map
         expect(emitMetric).toHaveBeenCalledWith(expect.objectContaining({ metric: 'cb_tripped', status: 503 }));
         expect(emitStructuredLog).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('suspended') }));

         // Memory Layer isolates and mirrors the new strict state natively
         expect(store.getSyncState(companyId).tripped).toBe(true);
    });

    it('3. Fail Safe Fallback: Forces safe fallback routing under Redis outage', async () => {
         process.env.CB_FAILSAFE_MODE = 'SHADOW';
         
         // Mock Redis Error internally natively mapped to connection dropping
         jest.spyOn(redisClient, 'hgetall').mockRejectedValueOnce(new Error('Redis connection timeout'));

         const state = await store.getState(companyId);
         
         // Should gracefully map based on Env constraint securely
         expect(state.tripped).toBe(false); // In SHADOW safe mode, we pretend it's fine and bypass the Prisma layers
         expect(emitStructuredLog).toHaveBeenCalledWith(expect.objectContaining({ metric: 'redis_store_failure' }));

         process.env.CB_FAILSAFE_MODE = 'TRIPPED';
         jest.spyOn(redisClient, 'hgetall').mockRejectedValueOnce(new Error('Redis connection timeout'));

         const trippedState = await store.getState(companyId);
         expect(trippedState.tripped).toBe(true); // Failsafe locks tenant.
    });

    it('4. Multi-Tenant Safely Avoids Collisions', async () => {
         const companyB = 'another-tenant-999';
         await store.reset(companyB);

         // Company A fails repeatedly
         for(let i=0; i<25; i++) {
             await store.incrementFailure(companyId); 
         }

         // Company B succeeds
         await store.incrementRequest(companyB);

         const stateA = store.getSyncState(companyId);
         const stateB = store.getSyncState(companyB);

         expect(stateA.tripped).toBe(true);
         expect(stateB.tripped).toBe(false);
         expect(stateB.requests).toBe(1);
         expect(stateB.failures).toBe(0);
         
         await store.reset(companyB);
    });
});
