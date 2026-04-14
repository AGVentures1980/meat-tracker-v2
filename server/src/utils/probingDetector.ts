interface BanEntry {
    attempts: number;
    banExpiresAt: number | null;
}

class ProbingDetector {
    private tracking: Map<string, BanEntry> = new Map();
    private MAX_ATTEMPTS = 10;
    private BAN_DURATION_MS = 15 * 60 * 1000; // 15 mins

    trackAttempt(userId: string, ip: string, endpoint: string) {
        const key = `${userId}:${ip}`;
        let record = this.tracking.get(key) || { attempts: 0, banExpiresAt: null };
        
        if (record.banExpiresAt && record.banExpiresAt > Date.now()) {
            return; // Already banned
        }

        record.attempts += 1;
        
        if (record.attempts >= this.MAX_ATTEMPTS) {
            record.banExpiresAt = Date.now() + this.BAN_DURATION_MS;
            console.warn(`[SECURITY ALERT] User ${userId} at IP ${ip} blocked via ProbingDetector after 10 unauthorized requests to ${endpoint}.`);
        }

        this.tracking.set(key, record);
    }

    isBlocked(userId: string, ip: string): boolean {
        const key = `${userId}:${ip}`;
        const record = this.tracking.get(key);
        if (!record) return false;

        if (record.banExpiresAt && record.banExpiresAt > Date.now()) {
            return true;
        }

        // Reset if ban expired
        if (record.banExpiresAt && record.banExpiresAt <= Date.now()) {
            this.tracking.delete(key);
        }

        return false;
    }

    clearTracking(userId: string, ip: string) {
        const key = `${userId}:${ip}`;
        this.tracking.delete(key);
    }
}

export const probingDetector = new ProbingDetector();
