import { PrismaClient } from '@prisma/client';
import express from 'express';
import request from 'supertest';
import { upsertForecastLog } from './src/controllers/forecastLogController';
import { receiveWeight } from './src/controllers/inboundReconciliationController';
import { requireIdempotency } from './src/middleware/idempotency';
import { FeatureFlags } from './src/utils/featureFlags';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

// Mock Auth
app.use((req, res, next) => {
    (req as any).user = { company_id: 'd04d5015-44a9-4bdd-9021-b8bd28caad9b', store_id: 1 };
    next();
});

app.post('/forecast', upsertForecastLog);
app.post('/inbound', receiveWeight);
app.post('/demo-idempotency', requireIdempotency, (req, res) => res.json({ success: true, msg: 'Pass' }));

const runSmokeTest = async () => {
    try {
        console.log('--- STARTING SMOKE TEST ---');

        // Force Flags
        FeatureFlags.FF_FORECAST_INTELLIGENCE = true;
        FeatureFlags.FF_INBOUND_RECONCILIATION = true;
        FeatureFlags.FF_ENTERPRISE_DASHBOARD = true;

        // 1. FORECAST
        const fRes = await request(app).post('/forecast').send({
            store_id: 1,
            business_date: new Date().toISOString(),
            reservation_forecast: 200,
            manager_adjusted_forecast: 210,
            actual_dine_in_guests: 180
        });
        console.log('1. FORECAST PERSISTENCE:', fRes.body.success ? 'OK' : 'FAIL', fRes.body);

        // 2. INBOUND (Need an invoice record first)
        const dummyInvoice = await prisma.invoiceRecord.create({
            data: {
                store_id: 1,
                item_name: 'SMOKE_TEST_BEEF',
                quantity: 1,
                price_per_lb: 10,
                cost_total: 100,
                expected_weight_lb: 100
            }
        });

        const iRes = await request(app).post('/inbound').send({
            invoice_id: dummyInvoice.id,
            received_weight_lb: 95
        });
        console.log('2. INBOUND CALCULATION:', iRes.body.success && iRes.body.invoice.weight_discrepancy_lb === -5 ? 'OK' : 'FAIL', iRes.body.invoice?.weight_discrepancy_lb);

        // 3. IDEMPOTENCY
        const reqPayload = { store_id: 1, external_id: 'test_123' };
        await request(app).post('/demo-idempotency').send(reqPayload);
        const dupRes = await request(app).post('/demo-idempotency').send(reqPayload);
        console.log('3. IDEMPOTENCY REJECTION:', dupRes.status === 409 ? 'OK' : 'FAIL', dupRes.status);

        // 4. CHANNEL SOURCE
        const usage = await prisma.meatUsage.create({
            data: {
                store_id: 1,
                protein: 'TEST_PROTEIN',
                lbs_total: 50,
                date: new Date(),
                source_type: 'RODIZIO'
            }
        });
        console.log('4. CHANNEL SOURCE_TYPE:', usage.source_type === 'RODIZIO' ? 'OK' : 'FAIL', usage.source_type);

        console.log('--- SMOKE TEST COMPLETE ---');

        // Cleanup
        await prisma.invoiceRecord.delete({ where: { id: dummyInvoice.id } });
        await prisma.meatUsage.delete({ where: { id: usage.id }});
        await prisma.forecastIntelligenceLog.deleteMany({ where: { store_id: 1 } });
    } catch (e) {
        console.error('SMOKE TEST FAILED ERROR:', e);
    } finally {
        await prisma.$disconnect();
    }
};

runSmokeTest();
