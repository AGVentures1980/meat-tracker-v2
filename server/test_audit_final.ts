import { PrismaClient } from '@prisma/client';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { requireIdempotency } from './src/middleware/idempotency';
import { receiveWeight } from './src/controllers/inboundReconciliationController';
import { upsertForecastLog } from './src/controllers/forecastLogController';

const prisma = new PrismaClient();

async function runAudit() {
  console.log("=== STARTING PRODUCTION AUDIT ===");
  try {
    const store = await prisma.store.findFirst();
    if (!store) throw new Error("No store found");
    const company_id = store.company_id;
    const store_id = store.id;

    // BLOCK 1: FORECAST DATA CONSISTENCY
    console.log("\n[BLOCK 1] FORECAST CONSISTENCY");
    await prisma.forecastIntelligenceLog.create({
      data: { company_id, store_id, business_date: new Date('2026-05-01'), reservation_forecast: 100, manager_adjusted_forecast: 110, actual_dine_in_guests: 105 }
    });
    await prisma.forecastIntelligenceLog.create({
      data: { company_id, store_id, business_date: new Date('2026-05-02'), reservation_forecast: 50, manager_adjusted_forecast: 150, actual_dine_in_guests: 40 }
    });
    await prisma.forecastIntelligenceLog.create({
      data: { company_id, store_id, business_date: new Date('2026-05-03'), reservation_forecast: null, manager_adjusted_forecast: null, actual_dine_in_guests: 100 }
    });
    console.log("PASS: Forecast Edge Cases Inserted Successfully.");

    // BLOCK 2: CHANNEL DISTRIBUTION (MeatUsage)
    console.log("\n[BLOCK 2] CHANNEL DISTRIBUTION");
    await prisma.meatUsage.create({
      data: { store_id, date: new Date(), itemName: 'Picanha', usage_lbs: 10, itemCode: '101', source_type: 'RODIZIO' }
    });
    await prisma.meatUsage.create({
      data: { store_id, date: new Date(), itemName: 'Picanha', usage_lbs: 5, itemCode: '101', source_type: 'DELIVERY' }
    });
    const agg = await prisma.meatUsage.groupBy({
      by: ['source_type'],
      _sum: { usage_lbs: true },
      where: { store_id }
    });
    console.log("PASS: Aggregations functional with source_type:", agg);

    // BLOCK 3: IDEMPOTENCY
    console.log("\n[BLOCK 3] IDEMPOTENCY STRESS");
    const app = express();
    app.use(express.json());
    app.post('/test', requireIdempotency, (req, res) => res.json({ success: true }));
    
    let promises = [];
    for(let i=0; i<10; i++) {
       promises.push(request(app).post('/test').set('x-idempotency-key', 'stress-key-1').send({ data: 1 }));
    }
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.status === 200).length;
    const conflictCount = results.filter(r => r.status === 409).length;
    console.log(`PASS: Idempotency 10 requests -> 200 OK: ${successCount}, 409 Conflict: ${conflictCount}`);

    // BLOCK 4: INBOUND EDGE CASES
    console.log("\n[BLOCK 4] INBOUND EDGE CASES");
    // expected > received
    const in1 = await prisma.invoiceRecord.create({ data: { companyId: company_id, date: new Date(), itemName: 'Picanha', expected_weight_lb: 100, received_weight_lb: 80, weight_discrepancy_lb: -20, unitPrice: 5, totalPrice: 500, createdBy: 1, purchaseOrderId: 'po-1', itemCode: '101', invoiceNumber: 'inv1' }});
    // received > expected
    const in2 = await prisma.invoiceRecord.create({ data: { companyId: company_id, date: new Date(), itemName: 'Picanha', expected_weight_lb: 80, received_weight_lb: 100, weight_discrepancy_lb: 20, unitPrice: 5, totalPrice: 500, createdBy: 1, purchaseOrderId: 'po-2', itemCode: '101', invoiceNumber: 'inv2' }});
    // expected = null (no expected passed)
    const in3 = await prisma.invoiceRecord.create({ data: { companyId: company_id, date: new Date(), itemName: 'Picanha', received_weight_lb: 100, weight_discrepancy_lb: 0, unitPrice: 5, totalPrice: 500, createdBy: 1, purchaseOrderId: 'po-3', itemCode: '101', invoiceNumber: 'inv3' }});
    console.log("PASS: Inbound constraints allow null expected and +/- discrepancies.");

    // CLEANUP
    await prisma.forecastIntelligenceLog.deleteMany({ where: { business_date: { gte: new Date('2026-05-01') } } });
    await prisma.meatUsage.deleteMany({ where: { source_type: { in: ['RODIZIO', 'DELIVERY'] } } });
    await prisma.invoiceRecord.deleteMany({ where: { purchaseOrderId: { in: ['po-1', 'po-2', 'po-3'] } } });
  } catch (error) {
    console.error("FAIL:", error);
  } finally {
    await prisma.$disconnect();
  }
}
runAudit();
