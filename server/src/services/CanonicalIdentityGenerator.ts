import { ParsedBarcodeData } from './BarcodeDecisionEngine';
import * as crypto from 'crypto';

export interface CanonicalIdentityCandidate {
    identityHash: string | null;
    canonicalGtin: string | null;
    supplierPrefix: string | null;
    sourceIntegrity: 'STRONG' | 'MEDIUM' | 'WEAK' | 'INVALID';
    identityBasis: 'EXACT_GTIN_14' | 'PRODUCT_CODE' | 'RAW_FALLBACK' | 'NONE';
    identityInputType: 'GS1_AI' | 'SUPPLIER_RULE' | 'EAN_VARIABLE' | 'FALLBACK';
    identityInputValue: string;
    supplierContextUsed: string | 'NO_SUPPLIER_CONTEXT';
    fallbackUsed: boolean;
}

export class CanonicalIdentityGenerator {
    
    public static generate(
        parsedData: ParsedBarcodeData, 
        supplierDomain?: string | null
    ): CanonicalIdentityCandidate {
        
        let hash: string | null = null;
        let integrity: 'STRONG' | 'MEDIUM' | 'WEAK' | 'INVALID' = 'INVALID';
        let basis: 'EXACT_GTIN_14' | 'PRODUCT_CODE' | 'RAW_FALLBACK' | 'NONE' = 'NONE';
        
        const supplierContext = supplierDomain || 'NO_SUPPLIER_CONTEXT';
        let inputValue = parsedData.rawBarcodes[0] || 'UNKNOWN_RAW';

        const inputType = (parsedData.source_parser || 'FALLBACK') as 'GS1_AI' | 'SUPPLIER_RULE' | 'EAN_VARIABLE' | 'FALLBACK';

        if (inputType === 'GS1_AI' && parsedData.gtin) {
            basis = 'EXACT_GTIN_14';
            inputValue = parsedData.gtin;
            integrity = supplierContext !== 'NO_SUPPLIER_CONTEXT' ? 'STRONG' : 'MEDIUM';
        } else if (inputType === 'EAN_VARIABLE' && parsedData.product_code) {
            basis = 'PRODUCT_CODE';
            inputValue = parsedData.product_code;
            integrity = 'MEDIUM'; 
        } else if (inputType === 'SUPPLIER_RULE' && (parsedData.gtin || parsedData.product_code)) {
            basis = parsedData.product_code ? 'PRODUCT_CODE' : 'EXACT_GTIN_14';
            inputValue = parsedData.product_code || parsedData.gtin || '';
            integrity = supplierContext !== 'NO_SUPPLIER_CONTEXT' ? 'STRONG' : 'MEDIUM';
        } else if (inputType === 'FALLBACK' && parsedData.gtin) {
            basis = 'EXACT_GTIN_14';
            inputValue = parsedData.gtin;
            integrity = 'WEAK';
        } else if (inputType === 'FALLBACK') {
            basis = 'RAW_FALLBACK';
            inputValue = parsedData.rawBarcodes[0];
            integrity = 'WEAK';
        } else {
            integrity = 'INVALID';
        }

        if (integrity !== 'INVALID') {
            const rawString = `${supplierContext}::${basis}::${inputValue}`;
            hash = crypto.createHash('sha256').update(rawString).digest('hex');
        }

        return {
            identityHash: hash,
            canonicalGtin: parsedData.gtin || null,
            supplierPrefix: supplierDomain || null,
            sourceIntegrity: integrity,
            identityBasis: basis,
            identityInputType: inputType,
            identityInputValue: inputValue,
            supplierContextUsed: supplierContext,
            fallbackUsed: inputType === 'FALLBACK' || integrity === 'WEAK'
        };
    }
}
