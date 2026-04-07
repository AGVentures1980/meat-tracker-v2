import { PrismaClient } from '@prisma/client';

const globalPrisma = new PrismaClient();

const MAX_ROWS = 5000;

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
                        if (user.scope.type === 'STORE') {
                            securedWhere.store_id = user.scope.storeId;
                        } else if (user.scope.type === 'AREA') {
                            securedWhere.store_id = { in: user.scope.storeIds || [] };
                        } else if (user.scope.type === 'COMPANY') {
                            securedWhere.company_id = user.scope.companyId;
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
