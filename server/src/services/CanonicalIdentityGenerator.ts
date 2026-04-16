import { ParsedBarcodeData } from './BarcodeDecisionEngine';
import * as crypto from 'crypto';

export interface CanonicalIdentityCandidate {
    identityHash: string;
    canonicalGtin: string | null;
    supplierPrefix: string | null;
    sourceIntegrity: 'STRONG' | 'WEAK';
}

export class CanonicalIdentityGenerator {
    
    public static generate(
        parsedData: ParsedBarcodeData, 
        supplierDomain?: string | null
    ): CanonicalIdentityCandidate | null {
        // Only generate for known structures we can trust minimally
        if (!parsedData.gtin && !parsedData.product_code) return null;

        const baseIdentifier = parsedData.gtin || parsedData.product_code || 'UNKNOWN';
        const integrity = parsedData.source_parser === 'GS1_AI' ? 'STRONG' : 'WEAK';
        const prefix = supplierDomain || 'UNKNOWN_SUPPLIER';

        const rawString = `${prefix}::${baseIdentifier}`;
        const hash = crypto.createHash('sha256').update(rawString).digest('hex');

        return {
            identityHash: hash,
            canonicalGtin: parsedData.gtin || null,
            supplierPrefix: prefix,
            sourceIntegrity: integrity
        };
    }
}
