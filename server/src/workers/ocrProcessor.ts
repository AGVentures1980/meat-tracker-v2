import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const prisma = new PrismaClient();

export const ocrWorker = new Worker('ocr-processor', async job => {
    const { fileBuffer, companyId, storeId } = job.data;
    console.log(`[WORKER] Starting OCR Processing for Company ${companyId}, Store ${storeId}. Job ID: ${job.id}`);
    
    // Simulate heavy OCR processing via AWS Textract or OpenAI Vision
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate an AI Vision payload extraction with fluctuating confidence
    const simulatedExtract = {
        invoice_number: `INV-AI-${Math.floor(Math.random() * 1000)}`,
        raw_line_text: '12 PCS PICANHA W/ GARLIC 20LBS',
        normalized_cut_name: 'Picanha',
        invoiced_price_per_lb: 6.50,
        ocr_confidence: Math.random() // Random confidence between 0.0 and 1.0 (for testing)
    };

    if (simulatedExtract.ocr_confidence < 0.85) {
        console.warn(`[OCR WARNING] Low confidence (${simulatedExtract.ocr_confidence.toFixed(2)}). Routing to Quarantine Queue.`);
        await prisma.ocrQuarantineQueue.create({
            data: {
                company_id: companyId,
                store_id: storeId,
                invoice_number: simulatedExtract.invoice_number,
                raw_line_text: simulatedExtract.raw_line_text,
                normalized_cut_name: simulatedExtract.normalized_cut_name,
                invoiced_price_per_lb: simulatedExtract.invoiced_price_per_lb,
                ocr_confidence: simulatedExtract.ocr_confidence,
                alert_status: 'PENDING_REVIEW'
            }
        });
        return { status: 'quarantined', confidence: simulatedExtract.ocr_confidence };
    }
    
    // In production, write safely directly to InvoiceRecord
    console.log(`[WORKER] High confidence (${simulatedExtract.ocr_confidence.toFixed(2)}). Processing InvoiceRecord straight through.`);
    return { status: 'success', extractedLines: 42 };
}, { connection });

ocrWorker.on('completed', job => {
    console.log(`OCR Job ${job.id} has completed!`);
});

ocrWorker.on('failed', (job, err) => {
    console.error(`OCR Job ${job?.id} has failed with ${err.message}`);
});
