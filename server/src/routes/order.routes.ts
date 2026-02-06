
import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';

const router = Router();

router.post('/', OrderController.createOrder);

export default router;
