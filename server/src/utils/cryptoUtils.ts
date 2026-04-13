import crypto from 'crypto';

export function generateFingerprint(type: string, tenantId: string, storeId: number | undefined, rawInput: string): string {
    const storePart = storeId ? storeId.toString() : 'GLOBAL';
    const payloadHash = crypto.createHash('sha256').update(rawInput).digest('hex');
    return `${type}|${tenantId}|${storePart}|${payloadHash}`;
}
