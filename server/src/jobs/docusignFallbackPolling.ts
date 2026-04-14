import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Mock Docusign Client call
 */
async function fetchDocuSignEnvelopeStatus(envelopeId: string): Promise<string> {
    // In production, this imports docusign-esign and makes a .getEnvelope(accountId, envelopeId)
    // For now we mock it as 'sent'
    return 'sent';
}

export async function docusignFallbackPolling() {
    const now = new Date();
    
    // Fetch pending companies
    const pendingTenants = await prisma.company.findMany({
        where: {
            contract_status: { in: ['SENT', 'DELIVERED'] }, // Pending resolution
            contract_id: { not: null },                     // Has an envelope mapped
            polling_attempts: { lt: 50 },                   // Limit not reached
            polling_expires_at: { gt: now }                 // Not completely expired
        }
    });

    for (const tenant of pendingTenants) {
        try {
            // Apply governed backoff strategy
            let shouldPoll = false;
            // Diff in hours since dispatch
            const hoursPending = (now.getTime() - (tenant.contract_signed_at?.getTime() || now.getTime())) / (1000 * 60 * 60);
            const minutesSinceLastPoll = (now.getTime() - (tenant.last_polled_at?.getTime() || 0)) / (1000 * 60);

            if (hoursPending <= 1 && minutesSinceLastPoll >= 10) {
                shouldPoll = true;
            } else if (hoursPending > 1 && hoursPending <= 6 && minutesSinceLastPoll >= 30) {
                shouldPoll = true;
            } else if (hoursPending > 6 && minutesSinceLastPoll >= 120) {
                shouldPoll = true;
            }

            if (!shouldPoll) continue;

            const envelopeId = tenant.contract_id!;
            const remoteStatus = await fetchDocuSignEnvelopeStatus(envelopeId);
            
            // Only care about completions not caught by Webhook.
            if (remoteStatus.toLowerCase() === 'completed') {
                await prisma.company.update({
                    where: { id: tenant.id },
                    data: {
                        contract_status: 'SIGNED',
                        contract_signed_at: now,
                        last_polled_at: now,
                        polling_attempts: { increment: 1 }
                    }
                });

                await prisma.auditLog.create({
                    data: {
                        action: 'CONTRACT_RECOVERED_BY_POLLING',
                        resource: 'COMPANY',
                        company_id: tenant.id,
                        details: {
                            envelope_id: envelopeId,
                            previous_status: tenant.contract_status,
                            new_status: 'SIGNED',
                            source: 'polling',
                            timestamp: now.toISOString()
                        }
                    }
                });
                console.log(`[SRE RECOVERY] Contract ${envelopeId} recovered and activated by polling.`);
            } else {
                // Just log the attempt
                await prisma.company.update({
                    where: { id: tenant.id },
                    data: {
                        last_polled_at: now,
                        polling_attempts: { increment: 1 }
                    }
                });
            }

        } catch (error: any) {
            console.error(`[SRE ERROR] Failed to poll envelope ${tenant.contract_id}:`, error);
        }
    }
}
