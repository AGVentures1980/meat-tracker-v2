import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { addMonths } from 'date-fns';

const prisma = new PrismaClient();

export const BillingController = {
    /**
     * Generates a monthly invoice for a company based on their plan.
     */
    async generateMonthlyInvoice(req: Request, res: Response) {
        try {
            const { companyId } = req.body;
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
     * Gets all invoices for the owner's viewing.
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
    }
};
