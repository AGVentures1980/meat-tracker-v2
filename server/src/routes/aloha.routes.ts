import { Router } from 'express';
import { AlohaWebhookController } from '../controllers/AlohaWebhookController';
import rateLimit from 'express-rate-limit';

const router = Router();

// Protect the endpoint from being flooded by unauthorized IPs
// EOD pushes should happen once per day per store, but we allow 100 requests per 10 mins 
// to be safe for a 60-unit chain sharing a single corporate IP gateway.
const alohaRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, 
    max: 100,
    message: { error: 'Too many ALOHA requests from this IP. Please wait 10 minutes.' }
});

router.post('/closeout', alohaRateLimiter, AlohaWebhookController.ingestPayload);
router.get('/job/status/:payload_id', AlohaWebhookController.getJobStatus);

export default router;
