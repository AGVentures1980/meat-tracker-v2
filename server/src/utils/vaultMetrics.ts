/**
 * VAULT TELEMETRY & CIRCUIT BREAKER ENGINE
 * Implements strict separation of Cardinality Metrics vs Audit Structured Logs.
 * Implements Distributed Shared-State Abstractions for Hysteresis & Isolation.
 */

// ---------------------------------------------------------
// SECTION A: DISTRIBUTED CIRCUIT BREAKER
// ---------------------------------------------------------

export interface CircuitBreakerState {
    requests: number;
    failures: number;
    tripped: boolean;
    trippedAt?: number;
}

export abstract class CircuitBreakerStore {
    abstract getState(companyId: string): Promise<CircuitBreakerState>;
    abstract saveState(companyId: string, state: CircuitBreakerState): Promise<void>;
    abstract getSyncState(companyId: string): CircuitBreakerState; // For non-blocking middleware sync
}

export class InMemoryCircuitBreakerStore extends CircuitBreakerStore {
    private stats: Record<string, CircuitBreakerState> = {};
    
    async getState(companyId: string) {
        if (!this.stats[companyId]) this.stats[companyId] = { requests: 0, failures: 0, tripped: false };
        return this.stats[companyId];
    }
    
    async saveState(companyId: string, state: CircuitBreakerState) {
        this.stats[companyId] = state;
    }

    getSyncState(companyId: string) {
        return this.stats[companyId] || { requests: 0, failures: 0, tripped: false };
    }
}

export class VaultCircuitBreaker {
    // Redis Ready via Integration Layer switch mapping instantly without modifying controllers.
    private static _store: CircuitBreakerStore;

    private static get store(): CircuitBreakerStore {
        if (!this._store) {
            if (process.env.CB_STORE === 'redis') {
                const { RedisCircuitBreakerStore } = require('../infrastructure/circuitBreaker/RedisCircuitBreakerStore');
                this._store = new RedisCircuitBreakerStore();
            } else {
                this._store = new InMemoryCircuitBreakerStore();
            }
        }
        return this._store;
    }
        
    private static readonly COOLDOWN_MS = 300_000; // 5 min fallback hysteresis lock
    private static readonly FAILURE_THRESHOLD = 0.03; // 3%

    static async recordSuccess(companyId: string) {
        const state = await this.store.getState(companyId);
        
        // Hysteresis Recovery Logics
        if (state.tripped && state.trippedAt && (Date.now() - state.trippedAt > this.COOLDOWN_MS)) {
             state.tripped = false;
             state.requests = 1;
             state.failures = 0;
             state.trippedAt = undefined;
             emitStructuredLog({ metric: 'circuit_breaker_recovered', companyId, status: 200, error: 'Cooldown elapsed, traffic stabilized. Restoring Enforcement.' });
        } else if (!state.tripped) {
            state.requests++;
        }
        await this.store.saveState(companyId, state);
    }

    static async recordFailure(companyId: string) {
        const state = await this.store.getState(companyId);
        
        if (state.tripped) {
            // Active Flapping Preventer: Extend cooldown if it fails during Half-Open evaluation.
            state.trippedAt = Date.now();
            await this.store.saveState(companyId, state);
            return;
        }

        state.requests++;
        state.failures++;
        
        if (state.requests > 20) {
            const failureRate = state.failures / state.requests;
            if (failureRate > this.FAILURE_THRESHOLD) {
                state.tripped = true;
                state.trippedAt = Date.now();
                emitStructuredLog({
                    metric: 'circuit_breaker_tripped',
                    companyId,
                    error: `Failure rate ${Math.round(failureRate * 100)}% exceeded 3% bounds. Enforcement locked for 5 minutes.`,
                    status: 503
                });
            }
        }
        await this.store.saveState(companyId, state);
    }

    static isVaultEnabled(companyId: string): boolean {
        if (process.env.ENABLE_VAULT === 'true') return true;
        const whitelist = process.env.VAULT_ENABLED_COMPANIES?.split(',') || [];
        return whitelist.includes(companyId);
    }

    static isEnforcementEnabledSync(companyId: string): boolean {
        const state = this.store.getSyncState(companyId);
        
        // Check local circuit breaker fallback block mechanism
        if (state.tripped) {
            if (Date.now() - (state.trippedAt || 0) < this.COOLDOWN_MS) {
                return false; // Safely locked in Shadow Legacy fallback mode for 5 mins
            }
            // Half-open: Allow execution to test metric success!
        }
        
        if (process.env.ENABLE_VAULT_ENFORCEMENT === 'true') return true;
        const whitelist = process.env.VAULT_ENFORCED_COMPANIES?.split(',') || [];
        return whitelist.includes(companyId);
    }
}

// ---------------------------------------------------------
// SECTION B: METRICS VS LOGS (CARDINALITY ISOLATION)
// ---------------------------------------------------------

/**
 * LOW CARDINALITY FOR TIME-SERIES AGGREGATIONS
 * Safe for infinite horizontal scale. Does not inject raw UUIDs (except Tenant).
 */
export function emitMetric(params: {
    metric: string;
    companyId: string;
    endpoint: string;
    status: number;
    latencyMs?: number;
}) {
    const output = {
        namespace: 'VaultTelemetry',
        type: 'Metric',
        metric: params.metric,
        companyId: params.companyId,
        endpoint: params.endpoint,
        status: params.status,
        latencyMs: params.latencyMs,
        timestamp: new Date().toISOString()
    };
    
    console.log(JSON.stringify(output));
    triggerCircuit(params);
}

/**
 * HIGH CARDINALITY FOR SECURITY / AUDITING
 * Only triggered on critical exceptions, validation boundaries, and IDOR traces.
 */
export function emitStructuredLog(params: {
    metric: string;
    companyId?: string;
    storeId?: string;
    userId?: string;
    requestId?: string;
    endpoint?: string;
    fileId?: string;
    status?: string | number;
    error?: string;
    latencyMs?: number;
}) {
    const traceId = params.requestId || `req-${Math.random().toString(36).substring(2, 9)}`;
    const output = {
        namespace: 'VaultAudit',
        type: 'StructuredLog',
        metric: params.metric,
        companyId: params.companyId || 'unknown',
        storeId: params.storeId,
        userId: params.userId,
        endpoint: params.endpoint,
        status: params.status,
        requestId: traceId,
        fileId: params.fileId,
        error: params.error,
        latencyMs: params.latencyMs,
        timestamp: new Date().toISOString()
    };
    
    console.log(JSON.stringify(output));
    
    // Only map error traces into circuits if status maps functionally
    if (params.status && params.companyId && params.endpoint) {
         triggerCircuit({ metric: params.metric, companyId: params.companyId, status: Number(params.status), latencyMs: params.latencyMs });
    }
}

function triggerCircuit(params: { metric: string, status: number, latencyMs?: number, companyId: string }) {
    if (params.metric.includes('failure') || params.status === 500) {
        VaultCircuitBreaker.recordFailure(params.companyId);
    } else if (params.latencyMs && params.latencyMs > 1500) {
        VaultCircuitBreaker.recordFailure(params.companyId);
    } else if (params.metric.includes('success')) {
        VaultCircuitBreaker.recordSuccess(params.companyId);
    }
}
