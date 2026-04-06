import { PrismaClient } from '@prisma/client';
import { EmailService } from './EmailService';

const prisma = new PrismaClient();

export class AlertEngine {
    public static async trigger(storeId: number, severity: 'INFO' | 'WARNING' | 'CRITICAL', source: string, description: string, rawData: any = null) {
        
        // 4 Hour Deduplication Time Window
        const recentAlerts = await prisma.systemAlert.findMany({
             where: {
                 store_id: storeId,
                 source: source,
                 description: description,
                 created_at: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) } 
             }
        });

        const alert = await prisma.systemAlert.create({
            data: {
                store_id: storeId,
                severity: severity,
                source: source,
                description: description,
                raw_data: rawData ? JSON.stringify(rawData) : null
            }
        });

        if (severity === 'CRITICAL' && recentAlerts.length === 0) {
             const user = await prisma.user.findFirst({ where: { role: 'admin' }, select: { first_name: true, last_name: true } });
            await EmailService.sendQCAlert({
                storeId: storeId.toString(),
                barcode: typeof rawData === 'string' ? rawData : JSON.stringify(rawData),
                user: user ? `${user.first_name} ${user.last_name}` : "System Admin",
                reason: `[CRITICAL ALERT] - ${source}: ${description}`
            });
        } else if (severity === 'CRITICAL' && recentAlerts.length >= 3) {
            // Trend Escalation - Mass groupings trigger unique subjects
            if (recentAlerts.length === 3) { 
                 const user = await prisma.user.findFirst({ where: { role: 'admin' }, select: { first_name: true, last_name: true } });
                await EmailService.sendQCAlert({
                    storeId: storeId.toString(),
                    barcode: "TREND DETECTED",
                    user: user ? `${user.first_name} ${user.last_name}` : "System Admin",
                    reason: `[CRITICAL ESCALATION] - ${source}: Multiple Anomaly Occurrences! (${recentAlerts.length + 1}x in 4 hours)`
                });
            }
        }
        
        return alert;
    }
}
