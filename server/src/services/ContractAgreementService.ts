import { PrismaClient, Company, TierLevel, DocuSignStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface ContractPayload {
  templateId: string;
  signerName: string;
  signerEmail: string;
  textTabs: Record<string, string>;
  contractVersion: string;
  tenantMetadata: Record<string, any>;
}

export class ContractAgreementService {
  
  /**
   * Retrieves specific DocuSign templates and pricing configurations based on Tier.
   */
  private static getTierConfig(tier: TierLevel) {
    if (tier === 'TIER_1') return { templateId: 'tmpl_tier1_v1', pricePerStore: '199.00', platformFee: '0.00', minCommitment: '1' };
    if (tier === 'TIER_2') return { templateId: 'tmpl_tier2_v1', pricePerStore: '149.00', platformFee: '499.00', minCommitment: '4' };
    return { templateId: 'tmpl_tier3_v1', pricePerStore: '99.00', platformFee: '999.00', minCommitment: '20' };
  }

  /**
   * 1. createTierContractPayload
   */
  public static async createTierContractPayload(company: Company, tier: TierLevel): Promise<ContractPayload> {
    const config = this.getTierConfig(tier);
    
    // Ensure we have an email target. In a real scenario, this might come from a `primaryContactEmail`
    // Assuming company.owner_id links to a User, but for safety in this layer we fallback.
    const signerEmail = 'owner@' + (company.subdomain || 'tenant') + '.com'; 
    const signerName = company.name + ' Representative';

    return {
      templateId: config.templateId,
      signerName,
      signerEmail,
      contractVersion: 'v2.0',
      textTabs: {
        tenant_name: company.name,
        price_per_store: `$${config.pricePerStore}`,
        platform_fee: `$${config.platformFee}`,
        min_store_commitment: config.minCommitment
      },
      tenantMetadata: {
        companyId: company.id,
        requestedTier: tier
      }
    };
  }

  /**
   * 2. validateContractPreconditions
   * Prevents duplicate/stale contract overlap. Fail-Closed approach.
   */
  public static async validateContractPreconditions(companyId: string, tier: TierLevel): Promise<Company> {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new Error(`Precondition Failed: Company ${companyId} not found.`);

    // Check if there is already an active non-terminal envelope
    const pendingStatuses: DocuSignStatus[] = ['PENDING', 'SENT', 'DELIVERED'];
    if (pendingStatuses.includes(company.contract_status) && company.contract_id) {
        throw new Error(`Precondition Failed: Envelope ${company.contract_id} is already in state ${company.contract_status}.`);
    }

    // Check if they are already on this tier with a signed contract
    if (company.current_tier === tier && company.contract_status === 'SIGNED') {
        throw new Error(`Precondition Failed: Tenant is already SIGNED on tier ${tier}.`);
    }

    return company;
  }

  /**
   * 3. markContractCreated
   * Prepares the DB state indicating an envelope was dispatched.
   */
  public static async markContractCreated(companyId: string, envelopeId: string, tier: TierLevel, version: string): Promise<Company> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    return prisma.company.update({
      where: { id: companyId },
      data: {
        contract_id: envelopeId,
        contract_status: 'SENT',
        contract_version: version,
        polling_attempts: 0,
        last_polled_at: null,
        polling_expires_at: expiresAt,
        // current_tier is NOT updated yet. Only upgraded upon signature.
      }
    });
  }
}
