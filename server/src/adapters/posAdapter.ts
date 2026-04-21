export interface PosAdapterInput {
    external_transaction_id: string;
    store_id: number;
    business_date: Date;
    shift_period: 'LUNCH' | 'DINNER' | 'ALL_DAY';
    dine_in_guests: number;
    channel: 'RODIZIO' | 'DELIVERY' | 'ALACARTE';
}

export interface PosAdapter {
    syncDailyGuests(input: PosAdapterInput): Promise<boolean>;
}
