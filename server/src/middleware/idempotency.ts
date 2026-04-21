import { Request, Response, NextFunction } from 'express';

const idempotencyCache = new Map<string, number>();

/**
 * Idempotency Middleware for API Reconciliations
 * Preferred: external_id + store_id
 * Fallback: business_date + store_id + shift_period
 */
export const requireIdempotency = (req: Request, res: Response, next: NextFunction) => {
    const { external_id, store_id, business_date, shift_period } = req.body;

    if (!store_id) {
        return res.status(400).json({ success: false, message: 'store_id is required for idempotency' });
    }

    let idempotencyKey = '';

    if (external_id) {
        idempotencyKey = `ext_${external_id}_store_${store_id}`;
    } else if (business_date && shift_period) {
        idempotencyKey = `date_${business_date}_shift_${shift_period}_store_${store_id}`;
    } else {
        return res.status(400).json({ 
            success: false, 
            message: 'Idempotency requires either (external_id) OR (business_date + shift_period)' 
        });
    }

    const now = Date.now();
    const lastRequest = idempotencyCache.get(idempotencyKey);

    // If a request with the same key was made in the last 15 minutes, reject it
    if (lastRequest && (now - lastRequest < 15 * 60 * 1000)) {
        console.warn(`[IDEMPOTENCY] Rejected duplicate request for key: ${idempotencyKey}`);
        return res.status(409).json({
            success: false,
            message: 'Duplicate request rejected by idempotency policy.',
            idempotencyKey
        });
    }

    idempotencyCache.set(idempotencyKey, now);
    next();
};
