
import { Request, Response } from 'express';
import multer from 'multer';

// Configure storage (memory for now to keep it simple/mocked)
const storage = multer.memoryStorage();
export const upload = multer({ storage: storage });

export class UploadController {
    static async handleUpload(req: Request, res: Response) {
        try {
            const file = req.file;
            const { type, store_id } = req.body;

            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            console.log(`[Upload] Processing ${type} file: ${file.originalname} for Store ${store_id}`);

            // Simulate Processing Delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Return Mocked Data based on type
            if (type === 'OLO') {
                return res.status(200).json({
                    message: "CSV Processed successfully. 45 records merged.",
                    records: 45
                });
            } else if (type === 'Ticket') {
                return res.status(200).json({
                    message: "AI Scan Complete: Found 12 lbs of Picanha.",
                    detected: { item: "Picanha", lbs: 12.0, confidence: 0.98 }
                });
            }

            return res.status(200).json({ message: "File uploaded successfully" });

        } catch (error) {
            console.error('Upload Error:', error);
            return res.status(500).json({ error: 'Upload failed' });
        }
    }
}
