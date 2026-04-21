import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { FeatureFlags } from '../utils/featureFlags';

const prisma = new PrismaClient();

export const receiveWeight = async (req: Request, res: Response) => {
    try {
        if (!FeatureFlags.FF_INBOUND_RECONCILIATION) {
            return res.status(403).json({ success: false, message: 'Feature flag FF_INBOUND_RECONCILIATION is disabled' });
        }

        const { invoice_id, received_weight_lb } = req.body;
        const store_id = (req as any).user?.store_id;

        if (!invoice_id || received_weight_lb === undefined) {
            return res.status(400).json({ success: false, message: 'Missing invoice_id or received_weight_lb' });
        }

        const invoice = await prisma.invoiceRecord.findUnique({
            where: { id: invoice_id }
        });

        if (!invoice) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        const discrepancy = invoice.expected_weight_lb !== null 
            ? Number(received_weight_lb) - Number(invoice.expected_weight_lb) 
            : null;

        const updated = await prisma.invoiceRecord.update({
            where: { id: invoice_id },
            data: {
                received_weight_lb: Number(received_weight_lb),
                weight_discrepancy_lb: discrepancy
            }
        });

        res.json({ success: true, invoice: updated });
    } catch (error: any) {
        console.error('Receive Weight Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
