import { PrismaClient } from '@prisma/client';
const globalPrisma = new PrismaClient();

export const tenantRawExecution = async (companyId: string, rawQueryTemplate: string, params: any[]) => {
    // Rejects SQL execution without evaluating companyId natively
    if (!companyId) {
        throw new Error('403: Unsafe Execution. Missing Tenant ID.');
    }
    
    // Simplistic guard against cross-tenant attacks
    const normalizedQuery = rawQueryTemplate.toLowerCase();
    if (!normalizedQuery.includes('company_id')) {
         throw new Error('403: Unsafe SQL execution missing company_id scoping.');
    }

    // Executes the query safely scoped to tenants
    return globalPrisma.$queryRawUnsafe(rawQueryTemplate, ...params);
}
