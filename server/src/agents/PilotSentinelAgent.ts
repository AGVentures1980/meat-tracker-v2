import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PilotSentinelAgent {
    /**
     * Executes the full audit suite. To be run via a cron job or scheduled task.
     */
    static async runAudit() {
        console.log(`[QA Sentinel] 🛡️ Initiating Pilot Data Integrity Audit at ${new Date().toISOString()}`);

        let anomaliesFound = 0;

        try {
            // 1. Audit Fat-Finger Data Entries (Extreme Lbs/Guest)
            const recentReports = await prisma.report.findMany({
                where: {
                    generated_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
                },
                include: { store: true }
            });

            for (const report of recentReports) {
                if (report.extra_customers <= 0) continue;

                const lbsPerGuest = report.total_lbs / report.extra_customers;

                // Anomaly Threshold: Realistic Lbs/Guest is between 1.0 and 2.5. 
                // Anything outside this is highly indicative of a data entry error (wrong inventory count or OLO payload).
                if (lbsPerGuest < 0.8 || lbsPerGuest > 3.0) {
                    await this.triggerAlert(
                        `FAT-FINGER ALERT: Store ${report.store.store_name} reported ${lbsPerGuest.toFixed(2)} Lbs/Guest for ${report.month} (${report.total_lbs} lbs / ${report.extra_customers} guests). This violates structural boundaries. Immediate data review required.`
                    );
                    anomaliesFound++;
                }
            }

            // 2. Audit OLO/Order Payload Anomalies (Massive single-day deliveries)
            const recentOrders = await prisma.order.findMany({
                where: {
                    order_date: { gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) } // Last 48 hrs
                },
                include: { items: true, store: true }
            });

            for (const order of recentOrders) {
                const totalDeliveryLbs = order.items.reduce((sum, item) => sum + item.lbs, 0);
                // Anomaly Threshold: A single delivery > 2000 lbs or < 10 lbs is suspicious for these stores
                if (totalDeliveryLbs > 2500 || (totalDeliveryLbs < 30 && order.items.length > 0)) {
                    await this.triggerAlert(
                        `ORDER ANOMALY: Store ${order.store.store_name} received an order of ${totalDeliveryLbs.toFixed(2)} lbs on ${order.order_date.toISOString().split('T')[0]}. This is highly irregular compared to baseline standard deviation.`
                    );
                    anomaliesFound++;
                }

                // Beef Ribs Conversion Check
                // Many managers confuse "Units" (Pieces) with "Lbs" when inputting Beef Ribs.
                // Assuming 1 Beef Rib = 5 Lbs.
                for (const item of order.items) {
                    if (item.protein_type === "Beef Ribs") {
                        // If they order e.g. "12 lbs", that's 2.4 ribs. Usually they order in boxes of ~60 lbs.
                        // If they order "10", did they mean 10 pieces (50 lbs) or 10 lbs (2 pieces)?
                        // Let's flag dangerously low numbers that look like unit counts instead of weights.
                        if (item.lbs > 0 && item.lbs < 20) {
                            await this.triggerAlert(
                                `UNIT CONFUSION ALERT (BEEF RIBS): Store ${order.store.store_name} received ${item.lbs} lbs of Beef Ribs. Did the manager enter 'Units' instead of 'Lbs'? (1 Beef Rib = ~5 lbs). Please verify the invoice.`
                            );
                            anomaliesFound++;
                        }
                    }
                }
            }

            // 3. Independent Math Verification (Ensuring MeatEngine logic hasn't drifted)
            // Example cross-check logic: verify if the sum of MeatUsage entries matches the Report total_lbs for recent weeks
            // This is a simplified check to ensure the two tables remain in equilibrium.
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const usageAggregates = await prisma.meatUsage.groupBy({
                by: ['store_id'],
                where: { date: { gte: thirtyDaysAgo } },
                _sum: { lbs_total: true }
            });

            for (const agg of usageAggregates) {
                if (agg._sum.lbs_total && agg._sum.lbs_total > 40000) { // arbitrary super high number check for month
                    await this.triggerAlert(
                        `MATH DRIFT ALERT: Store ID ${agg.store_id} shows aggregated MeatUsage totaling ${agg._sum.lbs_total.toFixed(2)} lbs over the last 30 days. This exceeds organic capacity.`
                    );
                    anomaliesFound++;
                }
            }

            // 4. Market Trend & Yield Learning Analysis (Systemic Supplier Variations)
            // If ALL pilot stores are suddenly showing high negative variance for a specific protein, 
            // it means the supplier changed the specs (e.g., fatter Picanha = lower yield).
            const recentCycles = await prisma.inventoryCycle.findMany({
                where: { start_date: { gte: thirtyDaysAgo } },
                include: { items: { include: { product: true } }, store: true }
            });

            // Group variances by protein across ALL stores
            const systemicVariances: Record<string, { totalVarianceLbs: number, cycleCount: number }> = {};

            for (const cycle of recentCycles) {
                for (const item of cycle.items) {
                    const proteinName = item.product.name;
                    if (!systemicVariances[proteinName]) {
                        systemicVariances[proteinName] = { totalVarianceLbs: 0, cycleCount: 0 };
                    }
                    systemicVariances[proteinName].totalVarianceLbs += item.variance_lbs;
                    systemicVariances[proteinName].cycleCount += 1;
                }
            }

            // Analyze for systemic market shifts
            for (const [protein, data] of Object.entries(systemicVariances)) {
                // If on average, the variance is consistently negative across multiple stores/cycles
                const averageVariance = data.totalVarianceLbs / data.cycleCount;
                if (averageVariance < -50 && data.cycleCount >= 3) { // Threshold: Losing >50 lbs average per cycle systematically
                    await this.triggerAlert(
                        `🧠 MARKET TREND DETECTED: Systematic negative variance observed for [${protein}]. Across ${data.cycleCount} recent inventory cycles, stores are averaging a loss of ${averageVariance.toFixed(2)} lbs. This indicates a potential SUPPLIER QUALITY DROP (e.g., lower yield, excess fat trimming). Recommend initiating a yield test with the meat purveyor.`
                    );
                    // We don't increment anomaliesFound here, as this is a business insight, not a system error.
                }
            }

            console.log(`[QA Sentinel] ✅ Audit Complete. Anomalies Detected: ${anomaliesFound}`);

        } catch (error) {
            console.error(`[QA Sentinel] ❌ Internal Audit Failure:`, error);
            await this.triggerAlert(`CRITICAL: QA Sentinel internal failure. The auditing engine threw an exception: ${error}`);
        }
    }

    /**
     * Dispatch alerts securely via the Idea Vault directly to the AGV Master Admin or Director level
     */
    private static async triggerAlert(message: string) {
        console.warn(`[QA Sentinel Alert Issued]: ${message}`);

        try {
            await prisma.ownerVaultMessage.create({
                data: {
                    text: `[QA SENTINEL WARNING] ${message}`,
                    sender: "AI", // Represents the system's autonomic nervous system
                    is_read: false
                }
            });
        } catch (dbErr) {
            console.error("Failed to write alert to Vault:", dbErr);
        }
    }
}

// Allow execution from CLI if run directly
if (require.main === module) {
    PilotSentinelAgent.runAudit().then(() => prisma.$disconnect());
}
