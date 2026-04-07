import { Queue } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Queue for heavy OCR and LLM processing of barcodes/invoices
export const ocrQueue = new Queue('ocr-processor', { connection });

// Queue for recalculating yields across multiple stores asynchronously
export const yieldAggregatorQueue = new Queue('yield-aggregator', { connection });

console.log('Background Queues Initialized');
