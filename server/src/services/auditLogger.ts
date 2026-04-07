import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuditLogParams {
    userId?: string;
    companyId?: string;
    action: string;
    resource: string;
    reason?: string;
    ipAddress?: string;
    details?: any;
    location?: string;
}

export const logAudit = async (params: AuditLogParams) => {
    try {
        await prisma.auditLog.create({
            data: {
                user_id: params.userId,
                company_id: params.companyId,
                action: params.action,
                resource: params.resource,
                reason: params.reason,
                ip_address: params.ipAddress,
                details: params.details || {},
                location: params.location || 'SYSTEM'
            }
        });
    } catch (error) {
        console.error("CRITICAL: Failed to write AuditLog", error);
    }
};
