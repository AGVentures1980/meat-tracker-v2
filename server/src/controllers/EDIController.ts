import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EDIController {
  
  // POST /api/v1/edi/inbound-invoice
  // Secure endpoint for external ERPs (Dynamic 365, Sysco, US Foods) to push invoice data.
  static async ingestInvoice(req: Request, res: Response) {
    try {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        return res.status(401).json({ error: "Missing x-api-key header" });
      }

      // Identify the target Company based on the API Key
      const company = await prisma.company.findUnique({
        where: { api_key: apiKey },
        include: { products: true, stores: true }
      });

      if (!company) {
        return res.status(403).json({ error: "Invalid API Key" });
      }

      const { store_external_id, invoice_number, items } = req.body;

      if (!store_external_id || !items || !Array.isArray(items)) {
         return res.status(400).json({ error: "Payload must include store_external_id and items array" });
      }

      // For MVP, map to the first store if external ID logic isn't fully mapped yet
      const targetStore = company.stores[0];
      if (!targetStore) {
        return res.status(400).json({ error: "Company has no registered stores." });
      }

      const createdInvoices = [];

      // Process each line item from the EDI payload
      for (const item of items) {
        // Simple string matching to find the internal Brasa OS Product ID
        const matchedProduct = company.products.find(p => 
          p.name.toLowerCase().includes(item.protein_name.toLowerCase()) ||
          item.protein_name.toLowerCase().includes(p.name.toLowerCase())
        );

        if (matchedProduct) {
          const newInvoice = await prisma.invoiceRecord.create({
            data: {
              store_id: targetStore.id,
              invoice_number: invoice_number || "EDI-AUTO",
              item_name: matchedProduct.name,
              quantity: item.lbs,
              price_per_lb: item.price_per_lb,
              cost_total: item.lbs * item.price_per_lb,
              source: "EDI_GATEWAY"
            }
          });
          createdInvoices.push(newInvoice);
        }
      }

      return res.status(200).json({ 
        message: "EDI Invoice Processed Successfully",
        lines_processed: createdInvoices.length,
        company: company.name
      });

    } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
      console.error('EDI Ingestion Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
