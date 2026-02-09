
import { MeatEngine } from '../engine/MeatEngine';

async function main() {
    console.log('Verifying Financial Targets...');

    const stats = await MeatEngine.getNetworkBiStats(2026, 10);

    console.log('Network Stats:', stats);

    if (stats.networkYield > 0) {
        console.log('✅ Network Yield is positive:', stats.networkYield);
    } else {
        console.error('❌ Network Yield is invalid:', stats.networkYield);
    }
}

main().catch(console.error);
