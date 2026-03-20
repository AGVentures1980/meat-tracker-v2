import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ComplianceController {
  
  // POST /api/v1/compliance/specs
  // Corporate Chef (David) calls this to save an approved barcode spec for the network.
  async createCorporateSpec(req: Request, res: Response) {
    try {
      const { company_id, protein_name, approved_brand, approved_item_code, created_by } = req.body;
      
      const newSpec = await prisma.corporateProteinSpec.create({
        data: {
          company_id,
          protein_name,
          approved_brand,
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
}
