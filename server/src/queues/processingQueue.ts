import { Queue } from 'bullmq';
import Redis from 'ioredis';

const RedisMock = require('ioredis-mock');
const connection = new RedisMock();

// Queue for heavy OCR and LLM processing of barcodes/invoices
export const ocrQueue = new Queue('ocr-processor', { connection });

// Queue for recalculating yields across multiple stores asynchronously
export const yieldAggregatorQueue = new Queue('yield-aggregator', { connection });

console.log('Background Queues Initialized');
