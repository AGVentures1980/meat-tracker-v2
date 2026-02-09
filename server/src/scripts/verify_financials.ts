
import { MeatEngine } from '../engine/MeatEngine';

async function main() {
    console.log('Verifying Financial Targets...');

    const stats = await MeatEngine.getNetworkBiStats(2026, 10);

    if (stats.length === 0) {
        console.error('No stats returned!');
        return;
    }

    const sample = stats[0];
    console.log('Sample Store Stats:', {
        name: sample.name,
        target_cost_guest: sample.target_cost_guest,
        costPerGuest: sample.costPerGuest,
        costGuestVar: sample.costGuestVar
    });

    if (sample.target_cost_guest && Math.abs(sample.target_cost_guest - 9.94) < 0.01) {
        console.log('✅ Target Cost per Guest matches expected 9.94');
    } else {
        console.error('❌ Target Cost per Guest mismatch:', sample.target_cost_guest);
    }
}

main().catch(console.error);
