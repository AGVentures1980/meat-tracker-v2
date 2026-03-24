import { Router } from 'express';
import { BillingController } from '../controllers/BillingController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Create a Stripe Checkout Session for upgrading/subscribing
router.post('/create-checkout-session', requireAuth, BillingController.createCheckoutSession);

// Create a Stripe Billing Portal Session for managing cards/invoices
router.post('/create-portal-session', requireAuth, BillingController.createPortalSession);
// Fetch all subscriptions for Master Admin
router.get('/all-subscriptions', requireAuth, BillingController.getAllSubscriptions);

export default router;
