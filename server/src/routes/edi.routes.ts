import { Router } from 'express';
import { EDIController } from '../controllers/EDIController';

const router = Router();

// This route is public because it authenticates via the x-api-key header,
// not via our standard JWT user token. 
router.post('/inbound-invoice', EDIController.ingestInvoice);

export default router;
