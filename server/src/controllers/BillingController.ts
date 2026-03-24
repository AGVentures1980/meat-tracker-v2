import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { addMonths } from 'date-fns';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
    apiVersion: '2026-02-25.clover',
});

// The base URL of the frontend for Stripe redirects
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const BillingController = {
    /**
     * Creates a Stripe Checkout Session for a Company subscription
     */
    async createCheckoutSession(req: Request, res: Response) {
        try {
            const { companyId, planId, quantity } = req.body;
            if (!companyId) return res.status(400).json({ error: 'Company ID is required' });

            const company = await prisma.company.findUnique({
                where: { id: companyId }
            });

            if (!company) return res.status(404).json({ error: 'Company not found' });

            // In production, planId should map to a Stripe Price ID. 
            // Here we use a hardcoded or env variable Price ID mapping.
            const priceId = process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_placeholder';

            // Create or retrieve Stripe Customer
            let customerId = company.stripe_customer_id;
            
            if (!customerId) {
                const customer = await stripe.customers.create({
                    name: company.name,
                    metadata: { companyId: company.id }
                });
                customerId = customer.id;
                
                await prisma.company.update({
                    where: { id: companyId },
                    data: { stripe_customer_id: customerId }
                });
            }

            // Create Checkout Session
            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card', 'us_bank_account'],
                line_items: [
                    {
                        price: priceId,
                        quantity: quantity || company.stores_licensed || 1,
                    },
                ],
                mode: 'subscription',
                success_url: `${FRONTEND_URL}/settings?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${FRONTEND_URL}/settings`,
                client_reference_id: companyId,
                subscription_data: {
                    metadata: { companyId: company.id }
                }
            });

            return res.json({ success: true, url: session.url });
        } catch (error: any) {
            console.error('Stripe Checkout Error:', error);
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Creates a Stripe Customer Portal Session for managing billing
     */
    async createPortalSession(req: Request, res: Response) {
        try {
            const { companyId } = req.body;
            
            const company = await prisma.company.findUnique({
                where: { id: companyId }
            });

            if (!company || !company.stripe_customer_id) {
                return res.status(404).json({ error: 'No active Stripe customer found for this company' });
            }

            const session = await stripe.billingPortal.sessions.create({
                customer: company.stripe_customer_id,
                return_url: `${FRONTEND_URL}/settings`,
            });

            return res.json({ success: true, url: session.url });
        } catch (error: any) {
            console.error('Stripe Portal Error:', error);
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Generates a monthly invoice for a company based on their plan (Legacy System).
     */
    async generateMonthlyInvoice(req: Request, res: Response) {
        try {
            const { companyId } = req.body;
            if (!companyId) return res.status(400).json({ error: 'Company ID is required' });

            const company = await prisma.company.findUnique({
                where: { id: companyId },
                include: { _count: { select: { stores: true } } }
            });

            if (!company) return res.status(404).json({ error: 'Company not found' });

            // Pricing logic
            const baseRates: Record<string, number> = {
                'starter': 299,
                'growth': 599,
                'enterprise': 1200
            };

            const rate = baseRates[company.plan] || 599;
            const perStoreFee = 150;
            const totalAmount = rate + (company._count.stores * perStoreFee);

            const invoice = await prisma.sysInvoice.create({
                data: {
                    company_id: companyId,
                    amount: totalAmount,
                    due_date: addMonths(new Date(), 1),
                    description: `Plan: ${company.plan.toUpperCase()} + ${company._count.stores} Stores`,
                    status: 'unpaid'
                }
            });

            return res.json({ success: true, invoice });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Gets all invoices for the owner's viewing (Legacy System).
     */
    async getOwnerFinances(req: Request, res: Response) {
        try {
            const invoices = await prisma.sysInvoice.findMany({
                include: { company: true },
                orderBy: { billing_date: 'desc' }
            });

            // Calculate metrics for the owner dashboard
            const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.status === 'paid' ? inv.amount : 0), 0);
            const pendingRevenue = invoices.reduce((sum, inv) => sum + (inv.status === 'unpaid' ? inv.amount : 0), 0);

            return res.json({
                success: true,
                invoices,
                metrics: {
                    totalRevenue,
                    pendingRevenue,
                    activeClients: new Set(invoices.map(i => i.company_id)).size
                }
            });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * @route   GET /api/v1/billing/all-subscriptions
     * @desc    Master Admin Endpoint to fetch all companies, their MRR, and Stripe status
     * @access  Super Admin / Master 
     */
    getAllSubscriptions: async (req: Request, res: Response) => {
        try {
            const companies = await prisma.company.findMany({
                include: {
                    _count: {
                        select: { stores: true }
                    }
                },
                orderBy: { created_at: 'desc' }
            });

            let totalMrr = 0;
            let totalActiveStores = 0;

            const subscriptions = companies.map(c => {
                const licensed_stores = c._count.stores || 0; // Using actual stores as licensed proxy
                const mrr = licensed_stores * 150; // $150 per store/month
                
                // Aggregation applies only if they are somehow paying or are considered active pipeline
                if (c.company_status === 'Active' || c.company_status === 'active' || c.stripe_subscription_id) {
                    totalMrr += mrr;
                    totalActiveStores += licensed_stores;
                }

                return {
                    id: c.id,
                    name: c.name,
                    stripe_customer_id: c.stripe_customer_id,
                    stripe_subscription_id: c.stripe_subscription_id,
                    status: c.company_status,
                    licensed_stores: licensed_stores, 
                    actual_stores: c._count.stores,
                    mrr: mrr
                };
            });

            return res.status(200).json({
                overview: {
                    total_mrr: totalMrr,
                    total_active_stores: totalActiveStores,
                    total_companies: companies.length
                },
                subscriptions
            });
        } catch (error) {
            console.error('getAllSubscriptions error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
};
