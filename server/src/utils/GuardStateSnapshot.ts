import fs from 'fs';
import path from 'path';

export interface GuardMetrics {
    last_boot_at: string;
    decision: 'PERMIT_BOOT' | 'BLOCK_BOOT' | 'PENDING';
    safe_count: number;
    error_count: number;
}

const snapshotPath = path.join(process.cwd(), '.guard-state.json');

export const GuardStateSnapshot: GuardMetrics = {
    last_boot_at: new Date().toISOString(),
    decision: 'PENDING',
    safe_count: 0,
    error_count: 0
};

// Hydrate from file if runMigrationGuard already deposited it
if (fs.existsSync(snapshotPath)) {
    try {
        const data = fs.readFileSync(snapshotPath, 'utf8');
        Object.assign(GuardStateSnapshot, JSON.parse(data));
    } catch (e) {
        console.error('[SRE] Failed to hydrate GuardStateSnapshot from disk');
    }
}

export function updateGuardSnapshot(update: Partial<GuardMetrics>) {
    Object.assign(GuardStateSnapshot, update);
    try {
        fs.writeFileSync(snapshotPath, JSON.stringify(GuardStateSnapshot, null, 2));
    } catch (e) {
        // Soft fail
    }
}
