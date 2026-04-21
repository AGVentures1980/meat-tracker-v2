export interface DeliveryAdapterInput {
    external_order_id: string;
    store_id: number;
    business_date: Date;
    shift_period: 'LUNCH' | 'DINNER' | 'ALL_DAY';
    order_count: number;
    lbs_consumed: number;
}

export interface DeliveryAdapter {
    syncDeliveryOrders(input: DeliveryAdapterInput): Promise<boolean>;
}
