export class CanonicalizerEngine {
    static resolve(source: string, raw: any): string {
        try {
            if (source === 'barcode') {
                return String(raw).replace(/\s+/g, '').toUpperCase();
            }
            if (source === 'olo') {
                const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
                return JSON.stringify({ external_id: p.external_id || p.order_id || 'UNKNOWN_ORDER', supplier: p.supplier || 'UNKNOWN' });
            }
            if (source === 'invoice') {
                const inv = typeof raw === 'string' ? raw : String(raw);
                return inv.replace(/\s+/g, '').substring(0, 50).toUpperCase(); // simplified canonical for raw string for now
            }
            if (source === 'image') {
                const im = typeof raw === 'string' ? raw : String(raw);
                // A true enterprise setup would checksum here, but for demo we hash length
                return `IMGSUM_${im.length}`; 
            }
            return String(raw).trim();
        } catch (e: any) {
            throw new Error(`CANONICALIZATION_FAILED`);
        }
    }
}
