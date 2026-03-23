import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class YieldController {
  
  /**
   * Logs the net yield of a primal box vs its scraps
   * Only applicable for ALACARTE operations.
   */
  async logYield(req: Request, res: Response) {
    try {
      const { storeId } = req.params;
      const { boxWeightLbs, scrapWeightLbs, userId, protein } = req.body;
      const companyId = (req as any).user?.company_id || (req as any).user?.companyId || 'tdb-main';

      // Validation
      if (!boxWeightLbs || !scrapWeightLbs) {
        return res.status(400).json({ error: 'Box weight and scrap weight are required.' });
      }

      const boxWeight = parseFloat(boxWeightLbs);
      const scrapWeight = parseFloat(scrapWeightLbs);

      if (scrapWeight >= boxWeight) {
        return res.status(400).json({ error: 'Scrap weight cannot be greater than or equal to box weight.' });
      }

      const netYield = boxWeight - scrapWeight;
      const yieldPct = (netYield / boxWeight) * 100;

      // In a real scenario, this would save to a new Prisma model like 'YieldLog'
      // For the A La Carte expansion MVP, we mock the success response to feed the UI.

      const result = {
        storeId,
        protein: protein || 'Unknown',
        boxWeight,
        scrapWeight,
        netYield,
        yieldPct,
        status: yieldPct >= 85 ? 'GOOD' : yieldPct >= 80 ? 'WARN' : 'BAD',
        loggedAt: new Date().toISOString()
      };

      // Mock Audit Log entry
      await prisma.auditLog.create({
        data: {
          action: 'LOG_YIELD',
          resource: `Store ${storeId} - ${protein}`,
          details: result,
          location: `YieldController - ALACARTE`,
          user_id: userId || 'system'
        }
      });

      return res.status(200).json({
        message: 'Yield logged successfully',
        data: result
      });

    } catch (error) {
      console.error('YieldController.logYield Error:', error);
      return res.status(500).json({ error: 'Failed to log yield data' });
    }
  }

  /**
   * Audits a portion cut vs the target spec
   * Only applicable for ALACARTE operations.
   */
  async auditPortion(req: Request, res: Response) {
    try {
      const { storeId } = req.params;
      const { targetOz, actualOz, userId, protein } = req.body;

      if (!targetOz || !actualOz) {
        return res.status(400).json({ error: 'Target and actual ounces are required.' });
      }

      const target = parseFloat(targetOz);
      const actual = parseFloat(actualOz);
      const variance = actual - target;
      const absVariance = Math.abs(variance);

      let status = 'GOOD';
      if (absVariance > 0.3) status = 'BAD';
      else if (absVariance > 0.1) status = 'WARN';

      const result = {
        storeId,
        protein: protein || 'Unknown',
        targetOz: target,
        actualOz: actual,
        varianceOz: variance,
        status,
        auditedAt: new Date().toISOString()
      };

      // Mock Audit Log entry for demo
      await prisma.auditLog.create({
        data: {
          action: 'AUDIT_PORTION',
          resource: `Store ${storeId} - Portioning`,
          details: result,
          location: `YieldController - ALACARTE`,
          user_id: userId || 'system'
        }
      });

      return res.status(200).json({
        message: 'Portion audited successfully',
        data: result
      });

    } catch (error) {
      console.error('YieldController.auditPortion Error:', error);
      return res.status(500).json({ error: 'Failed to audit portion' });
    }
  }

  /**
   * Saves the EOD Ghost Math Audit and triggers necessary escalation emails.
   */
  async saveGhostMathAudit(req: Request, res: Response) {
    try {
      const { storeId } = req.params;
      const { calculatedYieldLbs, unaccountedLbs, variancePct, status } = req.body;
      const userId = (req as any).user?.userId || 'system';

      if (variancePct === undefined || !status) {
        return res.status(400).json({ error: 'Missing required audit parameters.' });
      }

      const result = {
        storeId,
        calculatedYieldLbs,
        unaccountedLbs,
        variancePct,
        status,
        auditedAt: new Date().toISOString()
      };

      // Mock Audit Log entry that the JVP Dashboard will read
      await prisma.auditLog.create({
        data: {
          action: 'GHOST_MATH_AUDIT',
          resource: `Store ${storeId} - EOD Audit`,
          details: result,
          location: `YieldController - ALACARTE`,
          user_id: userId
        }
      });

      // Email Trigger Logic Hook
      if (status === 'FAIL') {
        console.log(`[EMAIL SEND SIMULATION] 🔴 CRITICAL GHOST MATH ALERT - Store ${storeId}`);
        console.log(`To: ManagingPartner@bloominbrands.com, CC: JVP_Region@bloominbrands.com`);
        console.log(`Subject: [ACTION REQUIRED] Critical Meat Variance Detected - Store #${storeId}`);
        console.log(`Body: A variance of ${variancePct.toFixed(2)}% (${unaccountedLbs} lbs) has been detected upon shift closure. Immediate action is required.`);
      } else if (status === 'REVIEW') {
        console.log(`[EMAIL SEND SIMULATION] 🟡 WARNING GHOST MATH - Store ${storeId}`);
        console.log(`To: ManagingPartner@bloominbrands.com`);
        console.log(`Subject: Review Needed: Shift Variance at ${variancePct.toFixed(2)}% (Store #${storeId})`);
      } else {
         console.log(`[EMAIL SEND SIMULATION] 🟢 OK GHOST MATH - Store ${storeId}`);
         console.log(`To: ManagingPartner@bloominbrands.com`);
         console.log(`Subject: Great Job! Shift Yield on Target (Store #${storeId})`);
      }

      return res.status(200).json({
        message: 'Ghost Math saved and escalations triggered.',
        data: result
      });

    } catch (error) {
      console.error('YieldController.saveGhostMathAudit Error:', error);
      return res.status(500).json({ error: 'Failed to save EOD ghost math.' });
    }
  }
}
