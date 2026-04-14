import express from 'express';
import { PrismaClient, DocuSignStatus } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Normalizes DocuSign API Status to our internal DB Status
 */
function normalizeDocuSignStatus(dsStatus: string): DocuSignStatus | null {
    const map: Record<string, DocuSignStatus> = {
        'sent': 'SENT',
        'delivered': 'DELIVERED',
        'completed': 'SIGNED',
        'declined': 'DECLINED',
        'voided': 'VOIDED'
    };
    return map[dsStatus.toLowerCase()] || null;
}

/**
 * POST /api/v1/webhooks/docusign
 * Receives envelope state changes and securely mutates the organization.
 */
router.post('/docusign', async (req, res) => {
    try {
        const { envelopeId, status: rawStatus, customFields } = req.body;

        // 1. Basic validation (would include crypto sig validation in production)
        if (!envelopeId || !rawStatus) {
            return res.status(400).json({ error: 'Invalid payload structure' });
        }

        const normalizedStatus = normalizeDocuSignStatus(rawStatus);
        if (!normalizedStatus) {
            // Ignored events like "created" or irrelevant statuses
            return res.status(200).send('Ignored status');
        }

        // 2. Fetch tracking entity
        const company = await prisma.company.findUnique({
            where: { contract_id: envelopeId }
        });

        if (!company) {
            // Log security event - Webhook mismatch
            await prisma.auditLog.create({
                data: {
                    action: 'CONTRACT_INVALID_WEBHOOK',
                    resource: 'DOCUSIGN_API',
                    details: { error: 'Envelope ID not mapped to any tenant', envelopeId, rawStatus }
                }
            });
            return res.status(404).send('Tenant not found for envelope');
        }

        // 3. Idempotency Check
        if (company.contract_status === normalizedStatus) {
            // Already processed this identical state.
            await prisma.auditLog.create({
                data: {
                    action: 'CONTRACT_POLLING_SKIPPED',
                    resource: 'COMPANY',
                    company_id: company.id,
                    details: { reason: 'Status unchanged', envelopeId, status: normalizedStatus, source: 'webhook' }
                }
            });
            return res.status(200).send('Idempotent skip');
        }

        // 4. Update Company Contract Truth State
        const isSigned = normalizedStatus === 'SIGNED';
        
        await prisma.company.update({
            where: { id: company.id },
            data: {
                contract_status: normalizedStatus,
                ...(isSigned && { contract_signed_at: new Date() })
            }
        });

        // 5. Audit Logging Structured
        await prisma.auditLog.create({
            data: {
                action: isSigned ? 'CONTRACT_STATUS_UPDATED' : 'CONTRACT_WEBHOOK_RECEIVED',
                resource: 'COMPANY',
                company_id: company.id,
                details: {
                    envelope_id: envelopeId,
                    previous_status: company.contract_status,
                    new_status: normalizedStatus,
                    source: 'webhook',
                    timestamp: new Date().toISOString()
                }
            }
        });

        res.status(200).json({ success: true, processedStatus: normalizedStatus });
    } catch (error: any) {
        console.error('[DocuSign Webhook Error]', error);
        res.status(500).json({ error: 'Internal processing failure' });
    }
});

export default router;
