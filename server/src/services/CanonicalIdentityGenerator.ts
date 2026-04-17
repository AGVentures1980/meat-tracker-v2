import * as crypto from 'crypto';
import { ParsedBarcodeData } from './BarcodeDecisionEngine';

export interface CanonicalIdentityCandidate {
    identityLevel: 'FAMILY_LEVEL' | 'ITEM_LEVEL' | 'RAW_FALLBACK';
    familyStableSignature: string | null;
    itemStableSignature: string;
    identityHash: string;
    familyHash: string | null;
    
    canonicalGtin: string | null;
    supplierPrefix: string | null;
    sourceIntegrity: 'STRONG' | 'MEDIUM' | 'WEAK' | 'INVALID';
    identityBasis: 'EXACT_GTIN_14' | 'PRODUCT_CODE' | 'SERIAL_PREFIX_HEURISTIC' | 'RAW_FALLBACK' | 'NONE';
    identityInputType: 'GS1_AI' | 'SUPPLIER_RULE' | 'EAN_VARIABLE' | 'FALLBACK';
    supplierContextUsed: boolean;
    fallbackUsed: boolean;
}

export class CanonicalIdentityGenerator {
    
    public static generate(
        parsedData: ParsedBarcodeData, 
        supplierDomain?: string | null
    ): CanonicalIdentityCandidate {
        
        let identityHash: string;
        let familyHash: string | null = null;
        let integrity: 'STRONG' | 'MEDIUM' | 'WEAK' | 'INVALID' = 'INVALID';
        let basis: 'EXACT_GTIN_14' | 'PRODUCT_CODE' | 'SERIAL_PREFIX_HEURISTIC' | 'RAW_FALLBACK' | 'NONE' = 'NONE';
        
        const supplierContext = supplierDomain || 'NO_SUPPLIER_CONTEXT';
        const supplierContextUsed = supplierDomain ? true : false;
        
        let familyStableSignature: string | null = null;
        let itemStableSignature: string = parsedData.rawBarcodes?.[0] || 'UNKNOWN_RAW';

        const inputType = (parsedData.source_parser || 'FALLBACK') as 'GS1_AI' | 'SUPPLIER_RULE' | 'EAN_VARIABLE' | 'FALLBACK';

        // 1. Establish ITEM LEVEL (Traceability)
        const itemParts = [parsedData.gtin, parsedData.serial, parsedData.productionDate].filter(Boolean);
        if (itemParts.length > 0) {
            itemStableSignature = itemParts.join('::');
        }

        // 2. Establish FAMILY LEVEL (Grouping)
        if (parsedData.product_code) {
            familyStableSignature = parsedData.product_code;
            basis = 'PRODUCT_CODE';
            integrity = 'STRONG';
        } else if (inputType === 'GS1_AI' && parsedData.gtin) {
            // Check if variable measure GTIN (USA standards usually start with 9)
            if (!parsedData.gtin.startsWith('9')) {
                familyStableSignature = parsedData.gtin;
                basis = 'EXACT_GTIN_14';
                integrity = supplierContextUsed ? 'STRONG' : 'MEDIUM';
            } else {
                // Variable Measure GTIN. Do not use GTIN as family. Try heuristic on SERIAL.
                if (parsedData.serial && parsedData.serial.length >= 6) {
                    const companyPrefix = parsedData.gtin.substring(0, 8);
                    const serialPrefix = parsedData.serial.substring(0, 6);
                    familyStableSignature = `${companyPrefix}-${serialPrefix}`;
                    basis = 'SERIAL_PREFIX_HEURISTIC';
                    integrity = 'MEDIUM';
                } else {
                    familyStableSignature = null;
                    basis = 'NONE';
                    integrity = 'WEAK';
                }
            }
        } else if (inputType === 'EAN_VARIABLE' && parsedData.gtin) {
            // Usually no product_code returned, just gtin in old parsers... wait, EAN_VARIABLE returns product_code
            familyStableSignature = null;
            basis = 'NONE';
            integrity = 'WEAK';
        } else if (inputType === 'FALLBACK') {
            familyStableSignature = null;
            basis = 'RAW_FALLBACK';
            integrity = 'WEAK';
        } else {
            integrity = 'INVALID';
        }

        // 3. Hash Generation
        const itemRawString = `${supplierContext}::ITEM::${itemStableSignature}::${parsedData.symbology || 'UNKNOWN'}`;
        identityHash = crypto.createHash('sha256').update(itemRawString).digest('hex');

        if (familyStableSignature) {
            const familyRawString = `${supplierContext}::FAMILY::${basis}::${familyStableSignature}::${parsedData.symbology || 'UNKNOWN'}`;
            familyHash = crypto.createHash('sha256').update(familyRawString).digest('hex');
        }

        let identityLevel: 'FAMILY_LEVEL' | 'ITEM_LEVEL' | 'RAW_FALLBACK' = 'ITEM_LEVEL';
        if (familyStableSignature) identityLevel = 'FAMILY_LEVEL';
        if (inputType === 'FALLBACK') identityLevel = 'RAW_FALLBACK';

        if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') {
            console.log(`[EXECUTION DEBUG - CanonicalIdentityGenerator V2]`);
            console.log(` -> Barcode: ${parsedData.rawBarcodes[0]}`);
            console.log(` -> Identity Level: ${identityLevel}`);
            console.log(` -> Family Signature: ${familyStableSignature || 'NULL'} (Basis: ${basis})`);
            console.log(` -> Item Signature: ${itemStableSignature}`);
            console.log(` -> Identity Hash (ITEM): ${identityHash}`);
            console.log(` -> Family Hash: ${familyHash || 'NULL'}`);
            console.log(` -> Supplier Context Used: ${supplierContextUsed}`);
            console.log(` -> Source Integrity: ${integrity}\n`);
        }

        return {
            identityLevel,
            familyStableSignature,
            itemStableSignature,
            identityHash,
            familyHash,
            canonicalGtin: parsedData.gtin || null,
            supplierPrefix: supplierDomain || null,
            sourceIntegrity: integrity,
            identityBasis: basis,
            identityInputType: inputType,
            supplierContextUsed,
            fallbackUsed: inputType === 'FALLBACK' || integrity === 'WEAK'
        };
    }
}
