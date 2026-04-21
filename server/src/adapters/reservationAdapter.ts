export interface ReservationAdapterInput {
    external_reservation_batch_id: string;
    store_id: number;
    business_date: Date;
    shift_period: 'LUNCH' | 'DINNER' | 'ALL_DAY';
    reservation_count: number;
}

export interface ReservationAdapter {
    syncDailyReservations(input: ReservationAdapterInput): Promise<boolean>;
}
