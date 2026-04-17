import { Request, Response } from 'express';
import { requireTenant } from '../utils/authContext';
import { InboundService } from '../services/InboundService';

export class InboundController {

    // GET /api/v1/inbound/available
    static async getAvailableShipments(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const storeId = user.storeId;
            const { supplierId } = req.query;

            const shipments = await InboundService.getAvailableShipments(storeId, supplierId as string);

            return res.json({ success: true, shipments });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: 'Failed to fetch available shipments' });
        }
    }

    // POST /api/v1/inbound/create-from-invoice
    static async createFromInvoice(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const storeId = user.storeId;
            const companyId = requireTenant(user);
            const { invoiceId, invoiceNumber, supplierId, items } = req.body;

            if (!invoiceNumber || !items || !Array.isArray(items)) {
                return res.status(400).json({ success: false, error: 'Missing required payload (invoiceNumber, items)' });
            }

            const result = await InboundService.expandInvoiceIntoVariableUnits({
                companyId,
                storeId,
                invoiceNumber,
                supplierId,
                items
            });

            return res.json({ success: true, shipment: result.shipment, message: result.message });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: 'Failed to create inbound shipment from invoice' });
        }
    }
}
