import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ComplianceController {
  
  // POST /api/v1/compliance/specs
  // Corporate Chef (David) calls this to save an approved barcode spec for the network.
  async createCorporateSpec(req: Request, res: Response) {
    try {
      const { company_id, protein_name, approved_brand, supplier, approved_item_code, created_by } = req.body;
      
      const user = (req as any).user;
      
      // Multi-Tenant Shield: If an admin hits this endpoint trying to lock a spec for 'tdb-main',
      // we must split-brain it across ALL Texas companies because physical scanners exist in discrete silos.
      let finalCompanyId = company_id;
      if (company_id === "tdb-main" && (!user || ['admin', 'director', 'owner', 'partner'].includes(user.role))) {
          const tdbCompanies = await prisma.company.findMany({
              where: { name: { contains: 'Texas', mode: 'insensitive' } }
          });
          
          if (tdbCompanies.length > 0) {
              const specPromises = tdbCompanies.map(comp => 
                  prisma.corporateProteinSpec.create({
                      data: {
                          company_id: comp.id,
                          protein_name,
                          approved_brand,
                          supplier: supplier || null,
                          approved_item_code,
                          created_by
                      }
                  })
              );
              await Promise.all(specPromises);
              
              // Return the first one just to satisfy the frontend UI
              const dummySpec = await prisma.corporateProteinSpec.findFirst({
                  where: { company_id: tdbCompanies[0].id, approved_item_code },
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
          approved_item_code,
          created_by
        }
      });
      
      res.status(201).json({ success: true, spec: newSpec });
    } catch (error: any) {
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
      console.error('Error fetching prevented attempts:', error);
      res.status(500).json({ success: false, error: 'Database error fetching prevented attempts.' });
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
      console.error('Error deleting spec:', error);
      res.status(500).json({ success: false, error: 'Database error deleting spec.' });
    }
  }
}
