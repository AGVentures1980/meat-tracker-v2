import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();

// Initialize Stripe API
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16' as any,
});

// The Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export class StripeWebhookController {
  
  /**
   * Handle incoming Stripe Events (e.g. checkout.session.completed)
   * This route MUST use express.raw({ type: 'application/json' }) before body parsing
   */
  static handleWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];

    let event: Stripe.Event;

    try {
      if (!endpointSecret || !sig) {
        throw new Error('Missing Stripe Webhook Secret or Signature');
      }
      // Verify webhook signature to prevent spoofing
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error(`⚠️  Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // 1. Extract metadata passed during Checkout Creation
        const proposalId = session.metadata?.proposal_id;
        const partnerId = session.metadata?.partner_id;

        if (proposalId && partnerId) {
          console.log(`[Stripe Webhook] Proposal ${proposalId} paid successfully! Provisioning...`);
          
          await StripeWebhookController.provisionEnterpriseAccount(proposalId, partnerId, session);
        }
        break;
      }
      
      // Additional events like invoice.payment_failed could go here to suspend MRR users.
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (customerId) {
          console.log(`[Stripe Webhook] Invoice payment failed for customer ${customerId}. Suspending account...`);
          await StripeWebhookController.suspendEnterpriseAccount(customerId);
        }
        break;
      }
      
      case 'invoice.paid': {
         const invoice = event.data.object as Stripe.Invoice;
         const customerId = invoice.customer as string;

         if (customerId) {
           console.log(`[Stripe Webhook] Invoice paid for customer ${customerId}. Restoring/Activating account...`);
           await StripeWebhookController.activateEnterpriseAccount(customerId);
         }
         break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.send();
  };

  /**
   * Transforms a Paid Proposal into a Live Enterprise Company and Mints the Partner Commission
   */
  private static provisionEnterpriseAccount = async (proposalId: string, partnerId: string, session: Stripe.Checkout.Session) => {
    try {
      // 1. Get the Proposal
      const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
      if (!proposal) return;

      // 2. Generate the safe subdomain (e.g., "Chicago Steaks" -> "chicago-steaks")
      const safeSubdomain = proposal.client_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

      // 3. Create the active Company tied to the Stripe Customer
      const newCompany = await prisma.company.create({
        data: {
          name: proposal.client_name,
          subdomain: safeSubdomain + '-' + Math.floor(Math.random() * 1000), // Ensure uniqueness
          stripe_customer_id: session.customer as string,
          billing_type: 'STRIPE_AUTO',
          company_status: 'Active',
          owner_id: partnerId // Or mapped to the primary admin email
        }
      });

      // 4. Link Company to the Partner (Reseller Architecture)
      await prisma.partnerClient.create({
        data: {
          partner_id: partnerId,
          company_id: newCompany.id,
          commission_rate: 25.0, // 25% MRR default
          setup_fee_share: 70.0 // 70% Hunting default
        }
      });

      // 5. Generate the Pending Payout Ledger entry for the Partner (70% of Setup Fee)
      const commissionAmount = proposal.setup_fee * 0.70;
      await prisma.payout.create({
        data: {
          partner_id: partnerId,
          amount: commissionAmount,
          currency: 'USD',
          status: 'Pending',
          type: 'SetupFee'
        }
      });

      // 6. Mark Proposal as Won
      await prisma.proposal.update({
        where: { id: proposalId },
        data: { status: 'Won' }
      });

      console.log(`[Stripe Webhook] Successfully provisioned ${proposal.client_name}. Commission of $${commissionAmount} marked Pending.`);

    } catch (err) {
      console.error('[Stripe Webhook] FATAL Error Provisioning Enterprise Account:', err);
      // In production, trigger an alert to AGV Owner here
    }
  };

  /**
   * Suspends a Company if their Stripe MRR Invoice fails (e.g., past due)
   */
  private static suspendEnterpriseAccount = async (stripeCustomerId: string) => {
    try {
      await prisma.company.updateMany({
        where: { stripe_customer_id: stripeCustomerId },
        data: { company_status: 'Suspended' }
      });
      console.log(`[Stripe Webhook] Company with Stripe ID ${stripeCustomerId} suspended successfully.`);
    } catch (error) {
      console.error(`[Stripe Webhook] Error suspending company for Stripe ID ${stripeCustomerId}:`, error);
    }
  };

  /**
   * Activates or Restores a Company when their Stripe MRR Invoice is paid
   */
  private static activateEnterpriseAccount = async (stripeCustomerId: string) => {
    try {
      await prisma.company.updateMany({
        where: { stripe_customer_id: stripeCustomerId },
        data: { company_status: 'Active' }
      });
      console.log(`[Stripe Webhook] Company with Stripe ID ${stripeCustomerId} activated/restored successfully.`);
    } catch (error) {
      console.error(`[Stripe Webhook] Error activating company for Stripe ID ${stripeCustomerId}:`, error);
    }
  };
}
