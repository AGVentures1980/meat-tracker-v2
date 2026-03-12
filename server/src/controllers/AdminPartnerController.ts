import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
}
