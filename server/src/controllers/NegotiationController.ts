import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MeatEngine } from '../engine/MeatEngine';
import { startOfYear, endOfYear, format } from 'date-fns';

const prisma = new PrismaClient();

export class NegotiationController {
    /**
     * GET /api/v1/negotiation/proposal
     * Generates a data-backed negotiation proposal based on annual network volume.
     */
    static async getProposal(req: Request, res: Response) {
        try {
            const userTokenData = (req as any).user;

            // Fetch company details from token context
            let companyName = 'Network Partner';
            if (userTokenData.companyId) {
                const company = await prisma.company.findUnique({
                    where: { id: userTokenData.companyId }
                });
                if (company) companyName = company.name;
            }

            // Fetch full user for sender info
            const fullUser = await prisma.user.findUnique({
                where: { id: userTokenData.id }
            });
            const senderName = fullUser?.first_name 
                ? `${fullUser.first_name} ${fullUser.last_name || ''}`.trim() 
                : 'Executive Director';

            // 1. Fetch Executive Stats (contains performance list of all stores for fallback counts)
            const stats = await MeatEngine.getExecutiveStats(userTokenData);
            const stores = stats.performance;

            // 2. Extract calculations from Frontend Payload
            const meatBreakdown = req.body.meatBreakdown || [];
            const storeCount = req.body.storeCount || stores.length || 1;

            // 3. Generate Proposal Metadata
            const topProteins = meatBreakdown
                .map((p: any) => ({
                    name: p.name,
                    annualLbs: p.projectedLbs || 0,
                    targetPrice: 0 // Will be calculated/estimated
                }))
                .sort((a: any, b: any) => b.annualLbs - a.annualLbs)
                .slice(0, 10);

            // Estimation of "Negotiation Savings" (e.g. 5% reduction on bulk)
            const currentAvgPrice = 5.65; // Group average
            const totalAnnualLbs = topProteins.reduce((acc: any, p: any) => acc + p.annualLbs, 0);
            const totalAnnualSpend = totalAnnualLbs * currentAvgPrice;
            const projectedSavings = totalAnnualSpend * 0.05; // 5% discount target

            // 4. Heuristic Content Generator
            const proposalContent = {
                title: "Annual Protein Supply & Strategic Partnership Proposal",
                recipient: "Valued Supplier Partner",
                sender: `${senderName} - Executive Director, ${companyName} Network`,
                date: format(new Date(), 'MMMM dd, yyyy'),
                summary: `Based on our current network performance across ${storeCount} locations, we are projecting a combined annual consumption of ${totalAnnualLbs.toLocaleString()} lbs of premium proteins. We are seeking to consolidate our supply chain to achieve a target average cost optimization of 5%.`,
                highlights: [
                    "Guaranteed annual volume commitment",
                    "Network-wide supply chain consolidation",
                    "Automated procurement & real-time inventory tracking enabled",
                    "Preferred partner status for future expansion"
                ],
                requirements: topProteins.map((p: any) => ({
                    item: p.name,
                    volume: p.annualLbs,
                    unit: 'Lbs',
                    notes: `Network-wide distribution to ${storeCount} regional hubs.`
                }))
            };

            return res.json({
                success: true,
                totalVolume: totalAnnualLbs,
                projectedSavings,
                proposal: proposalContent,
                rawAggregation: topProteins
            });

        } catch (error) {
            console.error('Negotiator Engine Failed:', error);
            return res.status(500).json({ success: false, error: 'Negotiation Logic Error' });
        }
    }
}
