import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ComplianceController {
  
  // POST /api/v1/compliance/specs
  // Corporate Chef (David) calls this to save an approved barcode spec for the network.
  async createCorporateSpec(req: Request, res: Response) {
    try {
      const { company_id, protein_name, approved_brand, supplier, approved_item_code, created_by, cost_per_lb } = req.body;
      
      const user = (req as any).user;
      
      let baseCode = approved_item_code;
      let ruleToCreate: any = null;

      if (approved_item_code.length === 13 && (approved_item_code.startsWith('20') || approved_item_code.startsWith('02'))) {
          baseCode = approved_item_code.substring(2, 7);
          ruleToCreate = { matchType: 'PREFIX', rawBarcodePattern: approved_item_code.substring(0, 7), matchStrength: 'STRONG', minPrefixLength: 7 };
      } else if (approved_item_code.includes('01') && approved_item_code.length >= 20) {
          const match = approved_item_code.match(/01(\d{14})/);
          if (match) {
              baseCode = match[1];
              ruleToCreate = { matchType: 'GTIN', gtin: match[1], matchStrength: 'STRONG' };
          }
      }

      // Helper to establish Supplier Profile & Rule per company
      const establishRule = async (companyId: string, specId: string) => {
          if (!ruleToCreate || !supplier) return;
          let supProfile = await prisma.supplierProfile.findFirst({ where: { companyId: companyId, name: supplier } });
          if (!supProfile) {
              supProfile = await prisma.supplierProfile.create({ data: { companyId: companyId, name: supplier } });
          }
          await prisma.supplierBarcodeRule.create({
              data: {
                  companyId: companyId,
                  supplierId: supProfile.id,
                  proteinSpecId: specId,
                  matchType: ruleToCreate.matchType,
                  rawBarcodePattern: ruleToCreate.rawBarcodePattern,
                  gtin: ruleToCreate.gtin,
                  normalizedProductCode: baseCode,
                  matchStrength: ruleToCreate.matchStrength,
                  minPrefixLength: ruleToCreate.minPrefixLength,
                  createdBy: created_by
              }
          });
      };

      // Multi-Tenant Shield: If an admin hits this endpoint trying to lock a spec for 'tdb-main',
      // we must split-brain it across ALL Texas companies because physical scanners exist in discrete silos.
      let finalCompanyId = company_id;
      if (company_id === "tdb-main" && (!user || ['admin', 'director', 'owner', 'partner'].includes(user.role))) {
          const tdbCompanies = await prisma.company.findMany({
              where: { name: { contains: 'Texas', mode: 'insensitive' } }
          });
          
          if (tdbCompanies.length > 0) {
              const specPromises = tdbCompanies.map(async comp => {
                  const spec = await prisma.corporateProteinSpec.create({
                      data: {
                          company_id: comp.id,
                          protein_name,
                          approved_brand,
                          supplier: supplier || null,
                          approved_item_code: baseCode,
                          cost_per_lb: cost_per_lb ? parseFloat(cost_per_lb) : null,
                          created_by
                      }
                  });
                  await establishRule(comp.id, spec.id);
                  return spec;
              });
              await Promise.all(specPromises);
              
              // Return the first one just to satisfy the frontend UI
              const dummySpec = await prisma.corporateProteinSpec.findFirst({
                  where: { company_id: tdbCompanies[0].id, approved_item_code: baseCode },
                  orderBy: { created_at: 'desc' }
              });
              
              return res.status(201).json({ success: true, spec: dummySpec });
          }
      }

      // Default Logic (No Split Brain or Not TDB)
      const newSpec = await prisma.corporateProteinSpec.create({
        data: {
          company_id: finalCompanyId,
          protein_name,
          approved_brand,
          supplier: supplier || null,
          approved_item_code: baseCode,
          cost_per_lb: cost_per_lb ? parseFloat(cost_per_lb) : null,
          created_by
        }
      });
      
      await establishRule(finalCompanyId, newSpec.id);

      res.status(201).json({ success: true, spec: newSpec });
    } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
      console.error('Error creating spec:', error);
      res.status(500).json({ success: false, error: 'Database error creating compliance spec.' });
    }
  }

  // GET /api/v1/compliance/specs/:companyId
  // Dashboard calls this to list all locked-in barcodes.
  async getCorporateSpecs(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      
      const specs = await prisma.corporateProteinSpec.findMany({
        where: { company_id: companyId },
        orderBy: { created_at: 'desc' }
      });
      
      const preventedCount = await prisma.barcodeScanEvent.count({
          where: {
              is_approved: false,
              store: {
                  company_id: companyId
              }
          }
      });
      
      res.json({ success: true, specs, preventedCount });
    } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
      console.error('Error fetching specs:', error);
      res.status(500).json({ success: false, error: 'Database error fetching specs.' });
    }
  }

  // GET /api/v1/compliance/prevented-attempts/:companyId
  // Fetches detailed logs of unauthorized scans blocked at the dock.
  async getPreventedAttempts(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      const attempts = await prisma.barcodeScanEvent.findMany({
          where: {
              is_approved: false,
              store: { company_id: companyId }
          },
          include: {
              store: { select: { store_name: true } }
          },
          orderBy: { scanned_at: 'desc' },
          take: 100
      });
      res.json({ success: true, attempts });
    } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
      console.error('Error fetching prevented attempts:', error);
      res.status(500).json({ success: false, error: 'Database error fetching prevented attempts.' });
    }
  }

  // GET /api/v1/compliance/master/fraud-audit
  // Fetches ALL unauthorized scans across the entire network, grouped/sortable, for Master Admin
  async getMasterFraudAudit(req: Request, res: Response) {
      try {
          const user = (req as any).user;
          // Protect this heavily
          if (!user?.email?.toLowerCase().includes('alexandre@alexgarciaventures.co')) {
             return res.status(403).json({ success: false, error: 'Unauthorized. Master access only.' });
          }

          const { startDate, endDate, companyId } = req.query;
          
          let dateFilter: any = {};
          if (startDate && endDate) {
              dateFilter = {
                  gte: new Date(startDate as string),
                  lte: new Date(endDate as string)
              };
          }

          const attempts = await prisma.barcodeScanEvent.findMany({
              where: {
                  is_approved: false,
                  ...(startDate && endDate ? { scanned_at: dateFilter } : {}),
                  ...(companyId ? { store: { company_id: companyId as string } } : {})
              },
              include: {
                  store: { 
                      select: { 
                          store_name: true,
                          company: { select: { name: true } }
                      } 
                  }
              },
              orderBy: { scanned_at: 'desc' }
          });
          
          res.json({ success: true, attempts });
      } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
          console.error("Error fetching master fraud audit:", error);
          res.status(500).json({ success: false, error: 'Database error fetching master fraud audit.' });
      }
  }

  // POST /api/v1/compliance/master/fraud-audit/bulk-delete
  // Deletes resolved fraud audit logs
  async deleteFraudAudits(req: Request, res: Response) {
      try {
          const user = (req as any).user;
          if (!user?.email?.toLowerCase().includes('alexandre@alexgarciaventures.co')) {
             return res.status(403).json({ success: false, error: 'Unauthorized. Master access only.' });
          }

          const { ids } = req.body;
          if (!ids || !Array.isArray(ids)) {
              return res.status(400).json({ success: false, error: 'Array of ids is required.' });
          }

          await prisma.barcodeScanEvent.deleteMany({
              where: { id: { in: ids } }
          });
          
          res.json({ success: true, message: 'Audits deleted successfully' });
      } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
          console.error("Error deleting fraud audits:", error);
          res.status(500).json({ success: false, error: 'Database error deleting fraud audits.' });
      }
  }

  // DELETE /api/v1/compliance/specs/:id
  async deleteCorporateSpec(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await prisma.corporateProteinSpec.delete({
        where: { id }
      });
      
      res.json({ success: true, message: 'Specification deleted successfully' });
    } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
      console.error('Error deleting spec:', error);
      res.status(500).json({ success: false, error: 'Database error deleting spec.' });
    }
  }
}
