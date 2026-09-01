import { Queue } from 'bullmq';
import { hasRedis, redisConnection } from '../utils/redis';

const createQueue = (name: string) => {
    if (hasRedis && redisConnection) {
        return new Queue(name, { connection: redisConnection });
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
