export interface GuardMetrics {
    version: string;
    boot_id: string;
    decision: 'PERMIT_BOOT' | 'BLOCK_BOOT' | 'PENDING';
    safe_count: number;
    warn_count: number;
    block_count: number;
    extra_in_db_count: number;
    checksum_mismatch_count: number;
    out_of_order_count: number;
    risk_score: number;
    warn_score: number;
    anomaly_detected: boolean;
    last_boot_at: string;
}

export const GuardStateSnapshot: GuardMetrics = {
    version: 'V6-OBSERVABLE-ZEROTRUST',
    boot_id: '',
    decision: 'PENDING',
    safe_count: 0,
    warn_count: 0,
    block_count: 0,
    extra_in_db_count: 0,
    checksum_mismatch_count: 0,
    out_of_order_count: 0,
    risk_score: 0,
    warn_score: 0,
    anomaly_detected: false,
    last_boot_at: new Date().toISOString()
};

export function updateGuardSnapshot(update: Partial<GuardMetrics>) {
    Object.assign(GuardStateSnapshot, update);
}
