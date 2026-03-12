import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import paypal from '@paypal/payouts-sdk';

const prisma = new PrismaClient();

// Configure PayPal Environment
const clientId = process.env.PAYPAL_CLIENT_ID || 'mock-client-id';
const clientSecret = process.env.PAYPAL_CLIENT_SECRET || 'mock-client-secret';
const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

export class AdminPartnerController {
  
  /**
   * Get all Partners (For the "Partner Cards" view)
   */
  static getAllPartners = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      // Strict sanity check: only 'admin' can view the global network
      if (user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Access Denied: Master Admin Only' });
      }

      const partners = await prisma.partner.findMany({
        include: {
          user: {
            select: {
              first_name: true,
              last_name: true,
              email: true
            }
          },
          clients: true,
          payouts: true,
          proposals: true
        }
      });

      // Map the payload to feed the visual Partner Cards
      const partnerCards = partners.map(p => {
        const activeClients = p.clients.filter(c => c.status === 'Active').length;
        const totalMRR = p.proposals
            .filter(prop => prop.status === 'Active')
            .reduce((sum, prop) => sum + prop.monthly_fee, 0);

        const pendingPayouts = p.payouts
            .filter(pay => pay.status === 'Pending')
            .reduce((sum, pay) => sum + pay.amount, 0);

        return {
          id: p.id,
          name: `${p.user.first_name} ${p.user.last_name}`,
          email: p.user.email,
          country: p.country,
          status: p.status,
          metrics: {
            activeClients,
            totalMRR,
            pendingPayouts
          }
        };
      });

      res.json({
        success: true,
        partners: partnerCards
      });

    } catch (error) {
      console.error('Error fetching global partner network:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch network' });
    }
  };

  /**
   * Get proposals flagged for "AGV_Review" (Anti-fraud / Mega Deals)
   */
  static getEscalatedProposals = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (user?.role !== 'admin') return res.status(403).json({ error: 'Access Denied' });

      const escalated = await prisma.proposal.findMany({
        where: { status: 'AGV_Review' },
        include: {
          partner: {
            include: { user: true }
          }
        }
      });

      res.json({
        success: true,
        proposals: escalated
      });
    } catch (error) {
      console.error('Error fetching escalated proposals:', error);
      res.status(500).json({ success: false, error: 'Fetch failed' });
    }
  };

  /**
   * Execute Payouts via PayPal 
   * Grabs all "Pending" commission rows for a specific Partner and disburses them.
   */
  static executePayouts = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (user?.role !== 'admin') return res.status(403).json({ error: 'Access Denied: Master Admin Only' });

      const { partnerId } = req.body;
      if (!partnerId) return res.status(400).json({ error: 'Missing partnerId' });

      // Fetch the Partner and all their Pending payouts
      const partner = await prisma.partner.findUnique({
        where: { id: partnerId },
        include: { payouts: { where: { status: 'Pending' } } }
      });

      if (!partner || !partner.paypal_email) {
        return res.status(400).json({ error: 'Partner not found or missing PayPal Email' });
      }

      const pendingPayouts = partner.payouts;
      if (pendingPayouts.length === 0) {
        return res.status(400).json({ error: 'No pending payouts for this partner.' });
      }

      // Calculate the Total Batch Amount
      const totalAmount = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

      // Construct the PayPal Payout API Request
      const request = new paypal.payouts.PayoutsPostRequest();
      request.requestBody({
        sender_batch_header: {
          sender_batch_id: `AGV_Batch_${Date.now()}_${partnerId.substring(0, 5)}`,
          email_subject: "You have a payout from AGV Meat Intelligence!",
          email_message: "You have received a payout for your recent Partner Reseller commissions. Keep up the great work!"
        },
        items: [
          {
            recipient_type: "EMAIL",
            amount: {
              value: totalAmount.toFixed(2),
              currency: "USD"
            },
            note: "Thanks for your partnership!",
            sender_item_id: `Item_${Date.now()}`,
            receiver: partner.paypal_email
          }
        ]
      });

      // Execute the request via SDK
      const response = await client.execute(request);
      
      const batchId = response.result?.batch_header?.payout_batch_id;

      if (!batchId) {
          throw new Error('PayPal API returned an undefined batch ID.');
      }

      // Update Database records to mark as Paid
      await prisma.payout.updateMany({
        where: { id: { in: pendingPayouts.map(p => p.id) } },
        data: {
          status: 'Paid',
          paid_at: new Date(),
          paypal_transaction_id: batchId
        }
      });

      res.json({
        success: true,
        message: 'Payout disbursed successfully via PayPal',
        batch_id: batchId,
        total_payout: totalAmount
      });

    } catch (error: any) {
      console.error('PayPal Execution Error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to execute PayPal payout', 
        details: error.message 
      });
    }
  };
  /**
   * Get all signed Partner Agreements for the Vault
   */
  static getVaultAgreements = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      // Strict sanity check: only 'admin' can view the global network
      if (user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Access Denied: Master Admin Only' });
      }

      const agreements = await prisma.partner.findMany({
        where: {
          agreement_signed_at: { not: null }
        },
        include: {
          user: {
            select: {
              first_name: true,
              last_name: true,
              email: true
            }
          }
        },
        orderBy: {
          agreement_signed_at: 'desc'
        }
      });

      res.json({
        success: true,
        agreements: agreements.map(a => ({
          id: a.id,
          name: `${a.user.first_name} ${a.user.last_name}`,
          email: a.user.email,
          legal_entity_type: a.legal_entity_type,
          tax_id: a.tax_id,
          country: a.country,
          agreement_signed_at: a.agreement_signed_at,
          agreement_ip: a.agreement_ip,
          training_completed_at: a.training_completed_at
        }))
      });

    } catch (error) {
      console.error('Error fetching vault agreements:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch agreements' });
    }
  };

  /**
   * Delete an escalated or drafted proposal (Master Admin)
   */
  static deleteProposal = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { proposalId } = req.params;

      if (user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Access Denied: Master Admin Only' });
      }

      const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
      if (!proposal) {
        return res.status(404).json({ success: false, error: 'Proposal not found' });
      }

      await prisma.proposal.delete({
        where: { id: proposalId }
      });

      res.json({ success: true, message: 'Proposal deleted successfully' });

    } catch (error) {
      console.error('Error deleting proposal:', error);
      res.status(500).json({ success: false, error: 'Failed to delete proposal' });
    }
  };
}
