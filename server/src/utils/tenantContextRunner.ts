import { getScopedPrisma } from '../config/scopedPrisma';

export interface TenantContext {
    type: 'GLOBAL' | 'PARTNER' | 'COMPANY' | 'AREA' | 'STORE';
    companyId?: number;
    storeId?: number;
    storeIds?: number[];
    email?: string;
    role?: string;
}

/**
 * Executes a background job inside a mathematically secure tenant sandbox.
 * Essential for Crons, Webhooks, OCR Processors, and queues that operate
 * outside of the standard Express.Request lifecycle.
 */
export async function runAsTenant(tenantContext: TenantContext, jobFunction: (scopedPrisma: any) => Promise<void>) {
    if (!tenantContext || !tenantContext.type) {
        throw new Error('FATAL SECURITY ERROR: runAsTenant invoked without a valid tenant context payload.');
    }

    // 1. Generate mathematically secured Prisma instance for this background user/cron
    const scopedPrisma = getScopedPrisma({ scope: tenantContext });

    try {
        // 2. Inject it into the worker function
        await jobFunction(scopedPrisma);
        
        // In the future: Log the successful background execution for audits
    } catch (error) {
        // Log critical background failures (useful for OCR pipeline failures)
        console.error(`[ContextRunner Error] Tenant: ${tenantContext.type} | Company: ${tenantContext.companyId}`, error);
        throw error;
    }
}
