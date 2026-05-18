import { PrismaClient } from '@prisma/client';
import { ReceivingVarianceReportData } from '../templates/receiving-variance-report.template';

const prisma = new PrismaClient();

export class ReportAuditLogService {

    /**
     * Logs the generation of a security/variance audit report directly to the immutable AuditLog table
     * ensuring regulatory compliance tracking (who, when, what checksum).
     */
    public static async logReportGeneration(
        data: ReceivingVarianceReportData,
        userId: string,
        ipAddress?: string
    ): Promise<void> {
        try {
            await prisma.auditLog.create({
                data: {
                    user_id: userId || null,
                    action: 'REPORT_GENERATION',
                    resource: `REPORT:RECEIVING-VARIANCE:${data.auditId}`,
                    store_id: typeof data.storeId === 'number' ? data.storeId : parseInt(data.storeId, 10) || null,
                    ip_address: ipAddress || 'SYSTEM_INTERNAL',
                    reason: 'Executive Audit Export Triggered',
                    details: {
                        auditId: data.auditId,
                        supplierCode: data.supplierCode,
                        complianceStatus: data.complianceStatus,
                        checksum: data.checksum,
                        traceChainId: data.traceChainId,
                        templateVersion: data.templateVersion,
                        itemsCount: data.items.length
                    }
                }
            });
        } catch (error) {
            console.error('CRITICAL: Failed to write compliance log to database AuditLog table:', error);
            // We log but do not throw, so that the report generation itself is not disrupted
        }
    }
}
