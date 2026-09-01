import { DeliveryController } from './controllers/DeliveryController';
import { ForecastController } from './controllers/ForecastController';
import { BurgerIntelligenceController } from './controllers/BurgerIntelligenceController';
import { AlohaWebhookController } from './controllers/AlohaWebhookController';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTests() {
    console.log("--- START TESTS ---");

    // Helper for mocking response
    const mockRes = () => {
        const res: any = {};
        res.status = (code: number) => {
            res.statusCode = code;
            return res;
        };
        res.json = (data: any) => {
            res.data = data;
            return res;
        };
        return res;
    };

    try {
        console.log("TEST 1: OLO Combo Decomposition");
        const req1 = {
            user: { storeId: 1, companyId: 'd04d5015-44a9-4bdd-9021-b8bd28caad9b' },
            body: { storeId: 1, date: "2026-05-19" }
        } as any;
        const res1 = mockRes();
        await DeliveryController.syncOlo(req1, res1);
        console.log(JSON.stringify(res1.data, null, 2));
    } catch (e) {
        console.log("TEST 1 FAILED:", e);
    }

    try {
        console.log("\nTEST 2: AI Forecast (ForecastController)");
        const req2 = {
            user: { storeId: 1, role: 'admin' },
            query: { date: "2026-05-19" }
        } as any;
        const res2 = mockRes();
        await ForecastController.getForecast(req2, res2);
        console.log(JSON.stringify(res2.data, null, 2));
    } catch (e) {
        console.log("TEST 2 FAILED:", e);
    }

    try {
        console.log("\nTEST 3: Burger Intelligence (syncAloha)");
        const req3 = {
            body: { storeId: 1, date: "2026-05-19", pos_count: 50 }
        } as any;
        const res3 = mockRes();
        await BurgerIntelligenceController.syncAloha(req3, res3);
        console.log(JSON.stringify(res3.data, null, 2));
    } catch (e) {
        console.log("TEST 3 FAILED:", e);
    }

    try {
        console.log("\nTEST 4: Aloha Webhook (ingestPayload)");
        const req4 = {
            headers: { authorization: 'Bearer 12345' },
            body: { store_id: '1', business_date: '2026-05-19', net_sales: 1000 }
        } as any;
        const res4 = mockRes();
        await AlohaWebhookController.ingestPayload(req4, res4);
        console.log(JSON.stringify(res4.data, null, 2));
    } catch (e) {
        console.log("TEST 4 FAILED:", e);
    }

    console.log("--- END TESTS ---");
    process.exit(0);
}

runTests();
