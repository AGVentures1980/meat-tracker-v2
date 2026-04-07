import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface CacheEntry {
    isValid: boolean;
    expiresAt: number;
}

class StoreValidator {
    private cache: Map<string, CacheEntry> = new Map();
    private TTL_MS = 1000 * 60 * 5; // 5 minutes

    async validateAccess(userId: string, storeId: number, companyId: string | null): Promise<boolean> {
        const cacheKey = `${userId}:${storeId}`;
        const cached = this.cache.get(cacheKey);

        if (cached && cached.expiresAt > Date.now()) {
            if (!cached.isValid) throw new Error('403: Store access denied');
            return true;
        }

        // DB Fallback
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        });

        if (!store || (companyId && store.company_id !== companyId)) {
            this.cache.set(cacheKey, { isValid: false, expiresAt: Date.now() + this.TTL_MS });
            throw new Error('403: Store access denied');
        }

        this.cache.set(cacheKey, { isValid: true, expiresAt: Date.now() + this.TTL_MS });
        return true;
    }
}

export const storeValidator = new StoreValidator();
