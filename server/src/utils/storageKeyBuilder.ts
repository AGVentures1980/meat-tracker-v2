import { randomUUID } from 'crypto';

export class StorageKeyBuilder {
    static generateKey(companyId: string | number, storeId: string | number, documentType: string, safeExt: string): string {
        const uuid = randomUUID();
        // Secure deterministic pattern to prevent injection attacks
        const sanitizedType = documentType.toLowerCase().replace(/[^a-z0-9_]/g, '');
        return `company_${companyId}/store_${storeId}/${sanitizedType}/${uuid}.${safeExt}`;
    }
}
