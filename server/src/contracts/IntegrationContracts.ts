export interface SourceProvenance {
    channel: 'UPLOAD' | 'EMAIL' | 'API' | 'EDI' | 'MANUAL';
    confidence: number; // 0.0 to 1.0
    original_payload: any;
    parser_version?: string;
    source_identifier?: string;
}

export type VarianceSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ExpectedDeliveryPayload {
    supplierId: string;
    asnNumber?: string;
    plannedDelivery: Date;
    lines: Array<{
        supplierItemCode: string;
        qtyExpected: number;
        weightExpected?: number;
    }>;
}

export interface SupplierDocumentPayload {
    supplierId: string;
    documentType: 'INVOICE' | 'PACKING_LIST' | 'BILL_OF_LADING' | 'ASN' | 'DELIVERY_NOTE';
    externalDocumentNumber?: string;
    issueDate?: Date;
    provenance: SourceProvenance;
    lines: Array<{
        supplierItemCode: string;
        qty?: number;
        weight?: number;
        price?: number;
    }>;
}

// POS Sales reconciliation interface
export interface PosSalesFeedPayload {
    storeId: number;
    businessDate: Date;
    sourceSystem: 'TOAST' | 'NCR' | 'MICROS' | 'SQUARE';
    transactionRef?: string;
    lines: Array<{
        itemSold: string;
        quantity: number;
        modifiers?: any;
        channel: 'DINE_IN' | 'DELIVERY' | 'CATERING';
    }>;
}

export interface ReconciliationEventSummary {
    reconciliationEventId: string;
    storeId: number;
    businessDate: Date;
    totalActiveVariances: number;
    highestSeverity: VarianceSeverity;
    isFullyReconciled: boolean;
}
