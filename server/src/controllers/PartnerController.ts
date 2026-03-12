import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();

// Initialize Stripe with the Secret Key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16' as any, // Typecast to avoid version literal clashes
});

export class PartnerController {
  
  /**
   * Get the Partner Dashboard stats (MRR, Client Count, Payouts)
   */
  static getDashboardStats = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userId = user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // 1. Validate the Partner exists
      const partner = await prisma.partner.findUnique({
        where: { user_id: userId },
        include: {
          clients: true,
          proposals: true,
          payouts: true
        }
      });

      if (!partner) {
        return res.status(404).json({ success: false, error: 'Partner profile not found for this user.' });
      }

      // Calculate Metrics
      const totalClients = partner.clients.length;
      
      // Calculate Active MRR (Monthly Recurring Revenue)
      const activeProposals = partner.proposals.filter(p => p.status === 'Active');
      const totalMRR = activeProposals.reduce((sum, p) => sum + p.monthly_fee, 0);

      // Extract your commission portion
      // This requires taking the average commission_rate for active clients 
      // or summing it directly per proposal/client logic. For simplicity,
      // assuming a flat 25% or utilizing the PartnerClient records.
      
      let commissionMRR = 0;
      for (const client of partner.clients) {
        if (client.status === 'Active') {
           // We would join the Proposal -> Company -> PartnerClient to get exact math. 
           // For now, baseline metrics.
           // This will be refined as the billing engine takes shape.
        }
      }

      // Calculate Payouts YTD
      const ytdPayouts = partner.payouts
        .filter(p => p.status === 'Paid')
        .reduce((sum, p) => sum + p.amount, 0);

      // Pending Payouts
      const pendingPayouts = partner.payouts
        .filter(p => p.status === 'Pending')
        .reduce((sum, p) => sum + p.amount, 0);

      res.json({
        success: true,
        stats: {
          totalClients,
          activeMRR: totalMRR, // The total value of the clients brought in
          ytdPayouts,
          pendingPayouts
        },
        proposals: partner.proposals, // recent proposals
        payouts: partner.payouts // recent history
      });
    } catch (error) {
      console.error('Error fetching partner dashboard stats:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch partner stats' });
    }
  };

  /**
   * Create a new Proposal (TripleSeat Style)
   */
  static createProposal = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userId = user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { 
        client_name, 
        contact_email, 
        contact_phone, 
        country, 
        language, 
        store_count,
        setup_fee,
        monthly_fee
      } = req.body;

      const partner = await prisma.partner.findUnique({
        where: { user_id: userId }
      });

      if (!partner) {
        return res.status(404).json({ success: false, error: 'Partner profile not found.' });
      }

      // -----------------------------------------------------------------
      // ANTI-FRAUD RULE #1: Domain Identity Scanner
      // -----------------------------------------------------------------
      const emailDomain = contact_email.split('@')[1]?.toLowerCase();
      if (!emailDomain) {
        return res.status(400).json({ success: false, error: 'Invalid email format provided.' });
      }

      // Check if domain exists in the active Company base OR existing Proposals
      // e.g., @texasdebrazil.com, @fogo.com are blocked
      // To implement this perfectly, we check `User` emails in system or `Proposal` contact_emails

      const existingTenantUsers = await prisma.user.count({
        where: {
          email: { endsWith: `@${emailDomain}` },
          role: { in: ['admin', 'director', 'area_manager'] }
        }
      });

      if (existingTenantUsers > 0) {
        return res.status(403).json({
          success: false,
          error: 'FRAUD_BLOCK_DOMAIN',
          message: 'This domain is already registered to an Active Enterprise client. You cannot cannibalize or split existing AGV parent deals.'
        });
      }

      // -----------------------------------------------------------------
      // ANTI-FRAUD RULE #2: Enterprise Deal Escalation (> 20 Stores)
      // -----------------------------------------------------------------
      let finalStatus = 'Draft';
      let agvNotes = null;

      if (store_count > 20) {
        finalStatus = 'AGV_Review';
        agvNotes = 'ENTERPRISE DEAL: Placed under AGV Master Negotiation Lock due to high store count.';
      }

      // Create Proposal
      const proposal = await prisma.proposal.create({
        data: {
          partner_id: partner.id,
          client_name,
          contact_email,
          contact_phone,
          country,
          language,
          store_count,
          setup_fee: Number(setup_fee),
          monthly_fee: Number(monthly_fee),
          status: finalStatus,
          agv_review_notes: agvNotes
        }
      });

      res.status(201).json({
        success: true,
        proposal,
        message: finalStatus === 'AGV_Review' 
          ? 'Enterprise Deal detected. Placed under AGV Review.' 
          : 'Proposal Draft created successfully.'
      });

    } catch (error) {
      console.error('Error creating proposal:', error);
      res.status(500).json({ success: false, error: 'Failed to create proposal' });
    }
  };

  /**
   * Accept a Proposal (Public Route for Clients) -> Generates Stripe Checkout
   */
  static acceptProposal = async (req: Request, res: Response) => {
    try {
      const { proposalId } = req.params;

      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        include: { partner: true }
      });

      if (!proposal) {
        return res.status(404).json({ success: false, error: 'Proposal not found' });
      }

      if (proposal.status !== 'Draft') {
        return res.status(400).json({ success: false, error: 'Proposal is no longer valid for acceptance.' });
      }

      // Calculate Total Initial Payment Amount (Setup Fee + First Month MRR)
      const totalInitialAmount = proposal.setup_fee + proposal.monthly_fee;

      // -------------------------------------------------------------
      // STRIPE CHECKOUT SESSION INTEGRATION 
      // -------------------------------------------------------------
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'us_bank_account'], // Allow Credit Card and ACH
        customer_email: proposal.contact_email,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Brasa Meat Intelligence OS - ${proposal.client_name}`,
                description: `Setup Fee ($${proposal.setup_fee}) + First Month MRR ($${proposal.monthly_fee}) for ${proposal.store_count} stores.`,
              },
              unit_amount: Math.round(totalInitialAmount * 100), // Stripe expects cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        // In production, these should point to the actual frontend domain
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/proposal/${proposal.id}`,
        metadata: {
          proposal_id: proposal.id,
          partner_id: proposal.partner_id,
          client_name: proposal.client_name,
        }
      });

      // Update proposal status to 'Awaiting_Payment'
      await prisma.proposal.update({
        where: { id: proposal.id },
        data: { status: 'Awaiting_Payment' }
      });

      // Return the Stripe Checkout URL to redirect the client
      res.json({
        success: true,
        checkout_url: session.url
      });

    } catch (error) {
      console.error('Error accepting proposal:', error);
      res.status(500).json({ success: false, error: 'Failed to accept proposal and generate invoice.' });
    }
  };
}
