import { Queue } from 'bullmq';
import Redis from 'ioredis';

const hasRedis = !!process.env.REDIS_URL;
let connection: any;
if (hasRedis) {
    connection = new Redis(process.env.REDIS_URL as string);
}

const createQueue = (name: string) => {
    if (hasRedis) {
        return new Queue(name, { connection });
    }
    // Mock queue for local development without Redis
    return {
        add: async (jobName: string, data: any) => {
            console.log(`[Queue Mock] Added job to ${name}:`, jobName);
            return { id: `mock-${Date.now()}` };
        }
    } as unknown as Queue;
};

// Queue for heavy OCR and LLM processing of barcodes/invoices
export const ocrQueue = createQueue('ocr-processor');

// Queue for recalculating yields across multiple stores asynchronously
export const yieldAggregatorQueue = createQueue('yield-aggregator');

// Queue for heavy ALOHA POS end-of-day JSON payload ingestion
export const alohaQueue = createQueue('aloha-ingestion');

console.log('Background Queues Initialized (Redis Mode: ' + (hasRedis ? 'ACTIVE' : 'MOCKED') + ')');
