import { PrismaClient } from '@prisma/client';
import { intakeQueue } from '../workers/intakeQueue';

const prisma = new PrismaClient();

export class MetricsController {
    
    public getSreObservability = async (req: any, res: any) => {
        try {
            const activeTenant = req.user.tenant_id;
            
            // Phase Final: Direct Broker Truth querying over Database mapping
            const [
                totalPendingOutbox,
                bullMqCounts,
                tenantFailedJobs,
                tenantDlqItems,
                stuckTotal
            ] = await Promise.all([
                prisma.outboxEvent.count({ where: { status: 'PENDING' } }),
                intakeQueue.getJobCounts(), // Source of Truth natively from REDIS
                prisma.intakeJob.count({ where: { error_message: { not: null } } }),
                prisma.goldenDatasetItem.count({ where: { status: 'REJECTED', tenant_id: activeTenant } }),
                prisma.goldenDatasetItem.count({ where: { status: 'PROCESSING', updated_at: { lt: new Date(Date.now() - 15 * 60 * 1000) } } })
            ]);

            res.json({
                success: true,
                tenant: activeTenant,
                metrics: {
                    outbox: {
                        pending_events: totalPendingOutbox,
                        publish_health: totalPendingOutbox > 100 ? 'DEGRADED' : 'HEALTHY'
                    },
                    bullmq_broker: {
                        waiting_depth: bullMqCounts.waiting,
                        active_running: bullMqCounts.active,
                        delayed_retries: bullMqCounts.delayed,
                        native_failed: bullMqCounts.failed
                    },
                    reliability: {
                        failed_jobs_total: tenantFailedJobs,
                        dead_letters: tenantDlqItems,
                        system_health: (tenantDlqItems > 50 || bullMqCounts.failed > 20) ? 'CRITICAL' : 'STABLE',
                        stuck_jobs_detected: stuckTotal
                    }
                }
            });
        } catch(e: any) {
            res.status(500).json({ error: "SRE Metrics Failed", cause: e.message });
        }
    };
}
