import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AuditService {
    /**
     * Log a sensitive action to the database
     */
    static async logAction(
        userId: string | null,
        action: string,
        resource: string,
        details: any = {},
        storeId?: number
    ) {
        try {
            await prisma.auditLog.create({
                data: {
                    user_id: userId,
                    action,
                    resource,
                    details,
                    location: storeId ? storeId.toString() : 'SYSTEM',
                    created_at: new Date()
                }
            });
            console.log(`[AuditLog] ${action} on ${resource} by ${userId || 'SYSTEM'}`);
        } catch (error) {
            console.error('[AuditService] Failed to create audit log:', error);
            // We don't throw here to avoid breaking the main business flow if logging fails
        }
    }
}
