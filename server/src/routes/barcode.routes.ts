import express from 'express';
import { BarcodeController } from '../controllers/BarcodeController';
import { requireAuth } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/parse', requireAuth, BarcodeController.parseBarcode);

export default router;
