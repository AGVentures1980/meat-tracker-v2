import { Router } from 'express';
import { SupportController } from '../controllers/SupportController';

const router = Router();

// Store Endpoints
router.get('/faq', SupportController.getFaqs);
router.get('/chat', SupportController.getStoreThread);
router.post('/chat', SupportController.sendMessage);

// Executive / Admin Endpoints
router.get('/tickets', SupportController.getActiveTickets);
router.post('/tickets/:ticketId/reply', SupportController.adminReply);
router.get('/ratings', SupportController.getCompanyRatings);

// Webhook / Store Rating Callback
router.post('/tickets/:ticketId/rating', SupportController.submitRating);

export default router;
