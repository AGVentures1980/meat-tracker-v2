import { Prisma, PrismaClient } from '@prisma/client';

const globalPrisma = new PrismaClient();

const MAX_ROWS = 5000;

// DYNAMIC WHITELIST: Pre-compute which models actually possess a company_id
// This prevents interceptor crashes when querying non-tenant bound tables explicitly.
const modelsWithCompanyId = new Set(
    Prisma.dmmf.datamodel.models
        .filter(m => m.fields.some(f => f.name === 'company_id'))
        .map(m => m.name)
);

// DYNAMIC WHITELIST for Phase 1 Enterprise Outlets
const modelsWithOutletId = new Set(
    Prisma.dmmf.datamodel.models
        .filter(m => m.fields.some(f => f.name === 'outlet_id'))
        .map(m => m.name)
);

const REGIONS: Record<string, number[]> = {
    'USA': [1202, 1203, 1205],
    'CARIBBEAN': [1204]
};

export function getScopedPrisma(user: any) {
    if (!user || !user.scope) {
        throw new Error('Access Denied: Unauthenticated or missing scope');
    }

    return globalPrisma.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    if (user.scope.type === 'GLOBAL' || user.scope.type === 'PARTNER') {
                        // Max rows cap applies everywhere
                        if (['findMany'].includes(operation)) {
                            (args as any).take = (args as any).take ? Math.min((args as any).take, MAX_ROWS) : MAX_ROWS;
                        }
                        return query(args);
                    }

                    const enforceTenant = (argsWhere: any = {}) => {
                        let securedWhere = { ...argsWhere };
                        
                        // ZERO TRUST: Mathematically lock the tenant boundary on every query
                        // But ONLY if the model structurally supports tenant scoping via company_id
                        if (user.companyId && modelsWithCompanyId.has(model)) {
                           securedWhere.company_id = user.companyId;
                        }

                        // Phase 1 Enterprise Handling: REGIONS
                        if (user.regionId && REGIONS[user.regionId]) {
                            securedWhere.store_id = { in: REGIONS[user.regionId] };
                        } else if (user.scope.type === 'STORE') {
                            securedWhere.store_id = user.scope.storeId;
                        } else if (user.scope.type === 'AREA') {
                            securedWhere.store_id = { in: user.scope.storeIds || [] };
                        } else if (user.scope.type === 'COMPANY') {
                            // Already handled by the universal boundary above
                            if (modelsWithCompanyId.has(model)) {
                                securedWhere.company_id = user.scope.companyId || user.companyId; 
                            }
                        }

                        // Phase 1 Enterprise Handling: OUTLET SCOPING
                        if (user.outletIds && Array.isArray(user.outletIds) && user.outletIds.length > 0) {
                            if (modelsWithOutletId.has(model)) {
                                securedWhere.outlet_id = { in: user.outletIds };
                            }
                        }

                        return securedWhere;
                    };

                    const applyRecursiveInclude = (includeObj: any) => {
                        const whitelistedIncludeModels = ['orders', 'users', 'stores', 'products', 'inventory', 'YieldEvent', 'ReceivingEvent'];
                        for (const key of Object.keys(includeObj)) {
                            if (includeObj[key] === true && whitelistedIncludeModels.includes(key)) {
                                includeObj[key] = { where: enforceTenant() };
                            } else if (typeof includeObj[key] === 'object' && includeObj[key] !== null) {
                                if (whitelistedIncludeModels.includes(key)) {
                                    includeObj[key].where = enforceTenant(includeObj[key].where || {});
                                }
                                if (includeObj[key].include) {
                                    applyRecursiveInclude(includeObj[key].include);
                                }
                            }
                        }
                    };

                    if (['findMany', 'findFirst', 'count', 'updateMany', 'deleteMany'].includes(operation)) {
                        (args as any).where = enforceTenant((args as any).where || {});
                    }

                    if (['findMany'].includes(operation)) {
                        (args as any).take = (args as any).take ? Math.min((args as any).take, MAX_ROWS) : MAX_ROWS;
                    }

                    // Recursively scrub and inject where scopes into includes
                    if ((args as any).include) {
                        applyRecursiveInclude((args as any).include);
                    }

                    return query(args);
                }
            }
        }
    });
}

export default globalPrisma;
