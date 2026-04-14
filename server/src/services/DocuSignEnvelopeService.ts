import { PrismaClient, TierLevel } from '@prisma/client';
import { ContractAgreementService } from './ContractAgreementService';
import { randomUUID } from 'crypto'; // Simulating DocuSign backend

const prisma = new PrismaClient();

export class DocuSignEnvelopeService {
  
  /**
   * sendContractEnvelope
   * Orchestrates payload creation, precondition checks, third-party dispatch, and state tracking.
   */
  public static async sendContractEnvelope(companyId: string, tier: TierLevel): Promise<{ envelopeId: string, status: string }> {
    try {
        // 1 & 2: Fetch and Validate
        const company = await ContractAgreementService.validateContractPreconditions(companyId, tier);

        // 3: Build Payload
        const payload = await ContractAgreementService.createTierContractPayload(company, tier);

        // 4: Send to DocuSign API (Mocked integration logic)
        console.log(`[DocuSign API] Dispatching envelope to ${payload.signerEmail}...`, payload);
        const mockedEnvelopeId = `env_${randomUUID()}`;
        
        // 5: Persist State (Fail-Closed)
        await ContractAgreementService.markContractCreated(companyId, mockedEnvelopeId, tier, payload.contractVersion);

        // 6: Register Audit Log
        await prisma.auditLog.create({
            data: {
                action: 'CONTRACT_ENVELOPE_CREATED',
                resource: 'COMPANY',
                company_id: companyId,
                details: {
                    envelope_id: mockedEnvelopeId,
                    tier,
                    contract_version: payload.contractVersion,
                    source: 'outbound'
                }
            }
        });

        return { envelopeId: mockedEnvelopeId, status: 'SENT' };

    } catch (error: any) {
        // Log explicitly any failure to create the contract
        await prisma.auditLog.create({
            data: {
                action: 'CONTRACT_ENVELOPE_SEND_FAILED',
                resource: 'COMPANY',
                company_id: companyId,
                details: {
                    error: error.message,
                    tier,
                    source: 'outbound'
                }
            }
        });
        throw error;
    }
  }
}
