
import { Router } from 'express';
import { UploadController, upload } from '../controllers/UploadController';

const router = Router();

// POST /api/v1/upload
router.post('/', upload.single('file'), UploadController.handleUpload);

export default router;
