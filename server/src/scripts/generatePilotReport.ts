import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🦅 Brasa Enterprise SRE
 * Pilot Mode Feedback & Efficacy Aggregator
 * Generates nightly readouts confirming if the Command Dashboard is actually converting.
 */
export async function generatePilotReport() {
    console.log("=========================================");
    console.log("BRASA SRE: DAILY PILOT EFFICACY REPORT");
    console.log("=========================================\n");

    const pilots = await prisma.pilotConfiguration.findMany({
        where: { status: 'ACTIVE' }
    });

    if (pilots.length === 0) {
        console.log("No Active Pilots deployed in field.");
        return;
    }

    let globalTTR = 0;
    let globalTTRCount = 0;

    for (const pilot of pilots) {
        console.log(`📡 [STORE ${pilot.storeId}] Pilot Mode: ${pilot.status}`);
        
        // 1. Actions Engagement
        const actions = await prisma.executiveActionDecision.findMany({
            where: { storeId: pilot.storeId, createdBySystem: true },
        });

        const totalActions = actions.length;
        const resolved = actions.filter(a => a.decisionStatus === 'RESOLVED').length;
        const forwarded = actions.filter(a => a.decisionStatus === 'FORWARDED').length;
        const ignored = actions.filter(a => a.decisionStatus === 'OPEN').length;

        // Calculate Average TTFA (Time to First Action)
        let ttrStore = 0;
        let ttrStoreCount = 0;
        for (const action of actions) {
             if (action.actedAt && action.generatedAt) { // Assume generatedAt comes from the Snapshot creation equivalent or creation Time. Wait, we don't have createdAt on ExecutiveActionDecision. We will track from viewedAt to actedAt in the real pipeline.
                 if (action.viewedAt) {
                     const ms = action.actedAt.getTime() - action.viewedAt.getTime();
                     ttrStore += ms;
                     ttrStoreCount++;
                     globalTTR += ms;
                     globalTTRCount++;
                 }
             }
        }

        const avgTTRSecs = ttrStoreCount > 0 ? ((ttrStore / ttrStoreCount) / 1000).toFixed(1) : 'N/A';

        console.log(`   - Actions Generated: ${totalActions}`);
        console.log(`   - Resolved: ${resolved} | Forwarded: ${forwarded} | Ignored: ${ignored}`);
        console.log(`   - Conversion Rate: ${totalActions > 0 ? Math.round(((resolved + forwarded)/totalActions) * 100) : 0}%`);
        console.log(`   - Avg Time To Respond (TTR): ${avgTTRSecs} seconds`);

        // 2. Feedback Friction
        const feedback = await prisma.pilotFeedback.findMany({
            where: { storeId: pilot.storeId }
        });

        if (feedback.length > 0) {
            console.log(`   ⚠️ FRICÇÃO: ${feedback.length} problemas reportados.`);
            // Group by category
            const cats = feedback.reduce((acc: any, curr) => {
                acc[curr.feedbackCategory] = (acc[curr.feedbackCategory] || 0) + 1;
                return acc;
            }, {});
            console.log(`   - Principais Ofensores:`, cats);
        } else {
            console.log(`   ✅ Zero Friction Reports on UI/UX.`);
        }
        console.log("-----------------------------------------");
    }

    if (globalTTRCount > 0) {
        console.log(`🎯 GLOBAL METRICS: Avg Decision Time: ${((globalTTR / globalTTRCount) / 1000).toFixed(1)}s`);
    } else {
        console.log(`🎯 GLOBAL METRICS: Not Enough Data Yet.`);
    }
}

// Execute if run directly via ts-node
if (require.main === module) {
    generatePilotReport().catch(console.error).finally(() => prisma.$disconnect());
}
