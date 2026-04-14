import { PrismaClient } from '@prisma/client';
import { ProteinLifecycleStrictEngine, HardFailError } from '../engine/ProteinLifecycleStrictEngine';
import { DataIntegrityWatchdog } from '../engine/DataIntegrityWatchdog';

const prisma = new PrismaClient();

async function runTests() {
    console.log("==================================================");
    console.log("BRASA SUPPLY CHAIN HARDLOCK - ENTERPRISE ZERO-TRUST");
    console.log("AUTOMATED VALIDATION SUITE");
    console.log("==================================================\n");

    try {
        console.log("▶ TEST 1: ILLEGAL STATE TRANSITION (SKIP PREP)");
        try {
            ProteinLifecycleStrictEngine.validateTransition('IN_COOLER', 'CONSUMED', 'TEST_BOX_123');
            console.error("❌ TEST 1 FAILED: Engine allowed skip from Cooler to Consumed.");
        } catch (err: any) {
            if (err instanceof HardFailError) {
                console.log(`✅ TEST 1 PASSED: Successfully threw HardFail: ${err.message}`);
            } else {
                console.error("❌ TEST 1 FAILED: Incorrect error type thrown.");
            }
        }

        console.log("\n▶ TEST 2: DUPLICATE REPLAY PROTECTION (DOUBLE PREP)");
        // Setup mock Box and Event
        const testBox = await prisma.proteinBox.create({
            data: {
                tenant_id: 1,
                store_id: 999, // use safe mock store
                barcode: 'FAKE-999-XXXX',
                product_name: "TEST PICANHA",
                received_weight_lb: 40.0,
                available_weight_lb: 40.0,
                received_by: 'TESTER'
            }
        });
        await prisma.boxLifecycleEvent.create({
            data: {
                box_id: testBox.id,
                store_id: 999,
                event_type: 'PULL_TO_PREP',
                previous_status: 'IN_COOLER',
                new_status: 'PULLED_TO_PREP',
                triggered_by: 'TESTER'
            }
        });

        try {
            await ProteinLifecycleStrictEngine.enforceUniqueOperation(testBox.id, 'PULL_TO_PREP');
            console.error("❌ TEST 2 FAILED: Allowed duplicate PULL_TO_PREP event.");
        } catch (err: any) {
             if (err instanceof HardFailError) {
                console.log(`✅ TEST 2 PASSED: Prevented multiple pulls. HardFail: ${err.message}`);
            } else {
                console.error("❌ TEST 2 FAILED: Incorrect error type thrown.");
            }
        }

        console.log("\n▶ TEST 3: UNACCOUNTED LOSS (INVISIBLE WASTE)");
        // We received 40.0 lbs. Let's consume 20 lbs. Nothing wasted.
        // It should flag 20 lbs missing!
        const lossResult = await ProteinLifecycleStrictEngine.trackInvisibleLoss(testBox.id, 20.0, 'TESTER');
        if (lossResult.unaccounted_loss >= 19.0) { // Should be exactly 20
            console.log(`✅ TEST 3 PASSED: Successfully caught missing weight: ${lossResult.unaccounted_loss} lbs`);
        } else {
            console.error(`❌ TEST 3 FAILED: Did not catch the missing weight. Checked: ${lossResult.unaccounted_loss}`);
        }

        console.log("\n▶ TEST 4: DELIVERY FIREWALL (DEGRADED STATE)");
        // We simulate running the Watchdog for Store 999 where DeliverySales is naturally 0
        const now = new Date();
        const start = new Date(now); start.setDate(now.getDate() - 1);
        const end = new Date(now); end.setDate(now.getDate() + 1);
        
        let integrity = await DataIntegrityWatchdog.performIntegrityAudit(999, start, end);
        if (integrity.state === 'DEGRADED' || integrity.state === 'RESTRICTED' || integrity.state === 'HARDLOCK') {
             console.log(`✅ TEST 4 PASSED: Engine correctly shifted from NORMAL due to Delivery offline or Unaccounted Loss. State: ${integrity.state} | Reason: ${integrity.lockReason}`);
        } else {
             console.error(`❌ TEST 4 FAILED: Watchdog allowed NORMAL state despite missing Delivery Data. State: ${integrity.state}`);
        }

        console.log("\n▶ TEST 5: ABSOLUTE HARDLOCK THRESHOLD (>10 lbs)");
        // We simulate an additional 15 lbs loss to force HARDLOCK regardless of %
        await ProteinLifecycleStrictEngine.trackInvisibleLoss(testBox.id, 5.0, 'TESTER'); // Adding another 15 loss
        integrity = await DataIntegrityWatchdog.performIntegrityAudit(999, start, end);
        if (integrity.state === 'HARDLOCK') {
             console.log(`✅ TEST 5 PASSED: Watchdog engaged Absolute HARDLOCK. Reason: ${integrity.lockReason}`);
        } else {
             console.error(`❌ TEST 5 FAILED: Watchdog did not trigger HARDLOCK. State returned: ${integrity.state}`);
        }

        // Cleanup
        await prisma.boxLifecycleEvent.deleteMany({ where: { store_id: 999 } });
        await prisma.proteinBox.deleteMany({ where: { store_id: 999 } });

        console.log("\n==================================================");
        console.log("EXECUTION COMPLETE");
        process.exit(0);
    } catch (err) {
        console.error("CRITICAL FAILURE IN SUITE:", err);
        // Cleanup on failure
        await prisma.boxLifecycleEvent.deleteMany({ where: { store_id: 999 } });
        await prisma.proteinBox.deleteMany({ where: { store_id: 999 } });
        process.exit(1);
    }
}

runTests();
