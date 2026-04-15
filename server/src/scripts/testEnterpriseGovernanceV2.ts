// server/src/scripts/testEnterpriseGovernanceV2.ts
import { GovernanceResolver } from '../domain/governance/GovernanceResolver';
import { IDeliveryRepository } from '../domain/governance/DeliveryFirewall';

// Mocks
class MockDeliveryRepoINFO_ZERO implements IDeliveryRepository {
    async countSyncLogs() { return 1; } // Tentou syncar
    async countSales() { return 0; }    // Mas vendeu ZERO
}

class MockDeliveryRepoFAILURE implements IDeliveryRepository {
    async countSyncLogs(storeId: number, start: Date, end: Date, status: string) { return status === 'FAILED' ? 5 : 0; }
    async countSales() { return 0; }
}

class MockWatchdogEngineHARDLOCK {
    async performIntegrityAudit() {
        return { state: 'HARDLOCK', lockReason: '12 lbs missing', totalLostLbs: 12.0 };
    }
}

class MockWatchdogEngineNORMAL {
    async performIntegrityAudit() {
        return { state: 'NORMAL', lockReason: '', totalLostLbs: 0.5 };
    }
}

async function runTests() {
    console.log('--- TEST 1: NORMAL OPERATION (ZERO DELIVERY KNOWN) ---');
    const res1 = await GovernanceResolver.resolveGovernance(
        new MockDeliveryRepoINFO_ZERO(),
        new MockWatchdogEngineNORMAL(),
        510, new Date(), new Date(), { hasDelivery: true }
    );
    console.log(`Global State: ${res1.globalState}`);
    console.log(`Delivery Domain Trust: ${res1.domainStatuses.DELIVERY.trustLevel}`);
    console.log(`Allowed Caps: ${res1.allowedCapabilities.join(', ')}`);
    console.log('----------------------------------------------------');

    console.log('\n--- TEST 2: HARDLOCK ENGAGED (MASSIVE PROTEIN LOSS) ---');
    const res2 = await GovernanceResolver.resolveGovernance(
        new MockDeliveryRepoINFO_ZERO(),  // Delivery is fine
        new MockWatchdogEngineHARDLOCK(), // Watchdog found missing beef
        510, new Date(), new Date(), { hasDelivery: true }
    );
    console.log(`Global State: ${res2.globalState}`);
    console.log(`Protein Lifecycle Trust: ${res2.domainStatuses.PROTEIN_LIFECYCLE.trustLevel}`);
    console.log(`Allowed Caps: ${res2.allowedCapabilities.join(', ')}`);
    console.log('----------------------------------------------------');

    console.log('\n--- TEST 3: DEGRADED (DELIVERY API FAILED) ---');
    const res3 = await GovernanceResolver.resolveGovernance(
        new MockDeliveryRepoFAILURE(),
        new MockWatchdogEngineNORMAL(),
        510, new Date(), new Date(), { hasDelivery: true }
    );
    console.log(`Global State: ${res3.globalState}`);
    console.log(`Delivery Evidence Code: ${res3.domainStatuses.DELIVERY.evidence[0].code}`);
    console.log(`Blocked Caps: ${res3.blockedCapabilities.join(', ')}`);
}

runTests().catch(console.error);
