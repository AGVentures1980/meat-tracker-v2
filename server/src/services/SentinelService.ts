import { EmailService } from './EmailService';

interface IPTracking {
    attempts: number;
    firstAttempt: number; // timestamp
    blockedUntil: number | null;
}

const MAX_ATTEMPTS = 3;
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes window to track bursts

// In-memory storage for active tracking
// In production with multiple instances, use Redis.
const ipTracker = new Map<string, IPTracking>();

export const SentinelService = {
    /**
     * Checks if an IP is currently blocked.
     */
    isBlocked(ip: string): boolean {
        const record = ipTracker.get(ip);
        if (!record || !record.blockedUntil) return false;

        if (Date.now() > record.blockedUntil) {
            // Block expired
            ipTracker.delete(ip);
            return false;
        }
        return true;
    },

    /**
     * Records a failed login attempt.
     * Triggers alert if threshold exceeded.
     */
    async trackAttempt(ip: string) {
        let record = ipTracker.get(ip);
        const now = Date.now();

        if (!record) {
            record = { attempts: 1, firstAttempt: now, blockedUntil: null };
            ipTracker.set(ip, record);
        } else {
            // Check if outside tracking window, reset if so
            if (now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
                record = { attempts: 1, firstAttempt: now, blockedUntil: null };
            } else {
                record.attempts++;
            }
            ipTracker.set(ip, record);
        }

        // Check Threshold
        if (record.attempts >= MAX_ATTEMPTS && !record.blockedUntil) {
            record.blockedUntil = now + BLOCK_DURATION_MS;
            ipTracker.set(ip, record);

            // 🚨 TRIGGER ALERT
            await EmailService.sendSecurityAlert({
                type: 'BRUTE_FORCE',
                ip: ip,
                details: `Detected ${record.attempts} failed login attempts in < 5 minutes. IP has been blocked for 5 minutes.`,
                timestamp: new Date()
            });

            console.log(`⛔ [SENTINEL] IP verified BLOCKED: ${ip}`);
        }
    },

    /**
     * Resets tracking on successful login.
     */
    reset(ip: string) {
        if (ipTracker.has(ip)) {
            ipTracker.delete(ip);
        }
    }
};
