import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const k1 = 'K_' + Math.random();
  const k2 = 'K_' + Math.random();
  try {
    await prisma.rawIntegrationPayload.create({
      data: {
        idempotency_key: k1,
        trace_id: k1,
        source_id: 'ALOHA_WEBHOOK',
        store_id: 'tx-db-001',
        raw_json: {},
        status: 'PENDING'
      }
    });
    console.log("Inserted K1");
    // Wait intentionally
    await prisma.rawIntegrationPayload.create({
      data: {
        idempotency_key: k2,
        trace_id: k2,
        source_id: 'ALOHA_WEBHOOK',
        store_id: 'tx-db-001',
        raw_json: {},
        status: 'PENDING'
      }
    });
    console.log("Inserted K2");
  } catch (err: any) {
    console.log("ERROR CODE:", err.code);
    console.log(err.message);
  }
}
run();
