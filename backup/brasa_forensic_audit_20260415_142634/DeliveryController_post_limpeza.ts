import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { getUserId, requireTenant, AuthContextMissingError } from '../utils/authContext';


const prisma = new PrismaClient();

// Standard Decomposition for Combo Items (Texas de Brazil Official Delivery Menu)
const MEAT_DECOMPOSITION = {
    "feast": [
        { protein: "Picanha", share: 0.25 },
        { protein: "Fraldinha/Flank Steak", share: 0.25 },
        { protein: "Chicken Drumstick", share: 0.25 }, // Map to Parmesan Drummettes share
        { protein: "Sausage", share: 0.25 }
    ],
    "plate": [
        { protein: "Picanha", share: 0.40 },
        { protein: "Filet Mignon", share: 0.30 },
        { protein: "Spicy Sirloin", share: 0.30 }
    ]
};

export class DeliveryController {
    /**
     * Helper to decompose weight into specific proteins
     */
    private static async decomposeMeat(itemName: string, totalWeight: number, companyId?: string): Promise<any[]> {
        const lowerName = itemName.toLowerCase();
        let breakdown: any[] = [];

        // 1. Fetch Dynamic Delivery Proteins if Company Context Exists
        let dynamicProteins: string[] = [];
        if (companyId) {
            try {
                // Use raw query or cast to any until Prisma types regenerate
                const products = await (prisma as any).companyProduct.findMany({
                    where: {
                        company_id: companyId,
                        include_in_delivery: true
                    }
                });
                dynamicProteins = products.map((p: any) => p.name.toLowerCase());
            } catch (err) {
                console.warn('Failed to fetch dynamic delivery proteins', err);
            }
        }

        if (lowerName.includes('feast')) {
            breakdown = MEAT_DECOMPOSITION.feast.map(p => ({
                protein: p.protein,
                weight: totalWeight * p.share
            }));
        } else if (lowerName.includes('plate')) {
            breakdown = MEAT_DECOMPOSITION.plate.map(p => ({
                protein: p.protein,
                weight: totalWeight * p.share
            }));
        } else {
            // Precise logic for all Delivery Proteins provided by Alex
            let detected = "Other";

            // Check dynamic list first
            const dynamicMatch = dynamicProteins.find(p => lowerName.includes(p));
            if (dynamicMatch) {
                // Capitalize for display
                detected = dynamicMatch.charAt(0).toUpperCase() + dynamicMatch.slice(1);
            }
            // Fallback to hardcoded rules
            else if (lowerName.includes('garlic picanha')) detected = "Garlic Picanha";
            else if (lowerName.includes('spicy sirloin')) detected = "Spicy Sirloin";
            else if (lowerName.includes('picanha')) detected = "Picanha";
            else if (lowerName.includes('flank') || lowerName.includes('fraldinha')) detected = "Flank Steak";
            else if (lowerName.includes('filet mignon wrapped in bacon')) detected = "Filet Mignon Bacon";
            else if (lowerName.includes('filet')) detected = "Filet Mignon";
            else if (lowerName.includes('sausage')) detected = "Brazilian Sausage";
            else if (lowerName.includes('chicken breast wrapped in bacon')) detected = "Chicken Bacon";
            else if (lowerName.includes('drummettes')) detected = "Parmesan Drummettes";
            else if (lowerName.includes('leg of lamb')) detected = "Leg of Lamb";
            else if (lowerName.includes('lamb chops')) detected = "Lamb Chops";
            else if (lowerName.includes('pork ribs')) detected = "Barbecued Pork Ribs";
            else if (lowerName.includes('pork loin')) detected = "Parmesan Pork Loin";

            breakdown = [{ protein: detected, weight: totalWeight }];
        }
        return breakdown;
    }

    /**
     * POST /api/v1/delivery/sync-olo
     */
    static async syncOlo(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { storeId, date } = req.body;

            // Verify store belongs to company
            const targetStoreId = storeId || user.storeId;
            const store = await prisma.store.findFirst({
                where: { id: targetStoreId, company_id: user.companyId }
            });

            if (!store) {
                return res.status(403).json({ error: 'Access Denied: Store not found or belongs to another company.' });
            }

            console.log(`[OLO] Syncing store ${targetStoreId} for date ${date}`);
            // ... (rest of logic)
            const oloRawData = [
                { item: "Feast for 4", qty: 2, price: 95.00 },
                { item: "Picanha (1 lb)", qty: 3, price: 24.50 },
                { item: "Chicken Plate", qty: 4, price: 18.00 }
            ];

            const proteinAggregation: Record<string, number> = {};
            let totalLbs = 0;
            let totalGuests = 0;
            let totalAmount = 0;

            for (const order of oloRawData) {
                let weight = 0;
                let guests = 0;

                if (order.item.toLowerCase().includes('feast')) {
                    weight = 2.0 * order.qty;
                    guests = 4 * order.qty;
                } else if (order.item.toLowerCase().includes('plate')) {
                    weight = 1.0 * order.qty;
                    guests = 1 * order.qty;
                } else {
                    weight = 0.5 * order.qty;
                    guests = 2 * order.qty;
                }

                totalLbs += weight;
                totalGuests += guests;
                totalAmount += order.price * order.qty;

                // Decompose into proteins
                const breakdown = await DeliveryController.decomposeMeat(order.item, weight, user.companyId);
                breakdown.forEach(b => {
                    proteinAggregation[b.protein] = (proteinAggregation[b.protein] || 0) + b.weight;
                });
            }

            const proteinBreakdownArray = Object.entries(proteinAggregation).map(([name, lbs]) => ({
                protein: name,
                lbs: parseFloat(lbs.toFixed(2))
            }));

            // PERSIST TO DATABASE
            await prisma.deliverySale.create({
                data: {
                    store_id: targetStoreId,
                    source: 'OLO',
                    total_lbs: totalLbs,
                    guests: totalGuests,
                    amount: totalAmount,
                    protein_breakdown: proteinBreakdownArray as any,
                    date: new Date(date)
                }
            });

            return res.json({
                success: true,
                metrics: { totalLbs, calculatedGuests: totalGuests, amount: totalAmount },
                proteinBreakdown: proteinBreakdownArray
            });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('OLO Sync Failed:', error);
            return res.status(500).json({ success: false, error: 'OLO Sync Failed' });
        }
    }

    /**
     * POST /api/v1/delivery/process-ticket
     */
    static async processTicket(req: Request, res: Response) {
        const requestId = Math.random().toString(36).substring(7);
        const user = (req as any).user;
        const storeId = user.storeId;

        try {
            // Verify store belongs to company (even if from JWT, safe to check)
            const store = await prisma.store.findFirst({
                where: { id: storeId, company_id: user.companyId }
            });

            if (!store) {
                return res.status(403).json({ error: 'Access Denied: Store not found or belongs to another company.' });
            }

            if (req.file) {
                console.log(`[OCR DEBUG ${requestId}] File received: ${req.file.originalname}, MIME: ${req.file.mimetype}`);
            } else {
                console.warn(`[OCR DEBUG ${requestId}] NO FILE RECEIVED in request`);
                return res.status(400).json({ error: 'No ticket image provided.' });
            }

            if (!process.env.OPENAI_API_KEY) {
                console.error(`[OCR DEBUG ${requestId}] OPENAI_API_KEY is missing!`);
                return res.status(500).json({ error: 'Engine Error: OPENAI_API_KEY is not configured.' });
            }

            const openai = new OpenAI();
            let mimeType = req.file.mimetype || 'image/jpeg';
            let processedBuffer = req.file.buffer;

            // Check and Convert HEIC
            if (mimeType === 'image/heic' || mimeType === 'image/heif' || req.file.originalname.toLowerCase().endsWith('.heic')) {
                console.log(`[OCR DEBUG ${requestId}] Converting HEIC to JPEG...`);
                const convert = require('heic-convert');
                processedBuffer = await convert({
                    buffer: req.file.buffer,
                    format: 'JPEG',
                    quality: 0.8
                });
                mimeType = 'image/jpeg';
            }

            // Optimize with Sharp (resize and compress)
            console.log(`[OCR DEBUG ${requestId}] Optimizing image with Sharp...`);
            const sharp = require('sharp');
            processedBuffer = await sharp(processedBuffer)
                .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toBuffer();
            mimeType = 'image/jpeg';

            const base64Image = processedBuffer.toString('base64');
            const companyId = requireTenant((req as any).user);

            const aiSystemPrompt = `You are a specialized OCR AI reading Restaurant End-Customer POS Receipts and Delivery Tickets (e.g., from Toast, OLO, UberEats, DoorDash).
Your sole job is to extract customer orders corresponding to Meat Proteins or Combos (like 'Feast for 4', 'Churrasco Plate', 'Picanha (1 lb)', etc.).
You must absolutely IGNORE side dishes, salads, drinks, and all non-meat items.

CRITICAL RULE (AVOID DOUBLE COUNTING): If the receipt shows a combo/feast (e.g. 'Feast for 4') and ALSO lists the specific meat choices underneath it as modifiers, you MUST NOT extract the combo name itself. ONLY extract the specific meat choices to avoid double-counting.

Return ONLY a valid JSON object (no markdown formatting, no backticks) with a single root key 'items' which is an array of objects.
Each object must have:
- 'item' (string, the name of the dish or meat exactly as printed, adjusting to standards like 'Picanha', 'Filet Mignon' if obvious).
- 'qty' (number, the quantity of that item ordered).
- 'price' (number, total line item price).

If you cannot read the image or find no meat items, return {"items": []}.`;

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: aiSystemPrompt
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Please extract the restaurant delivery / takeout order from this ticket." },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                response_format: { type: "json_object" },
                max_tokens: 1000,
            });

            const content = response.choices[0].message.content;
            if (!content) throw new Error("Empty response from OpenAI");

            const parsedData = JSON.parse(content);
            const scannedItems = parsedData.items || [];

            const proteinAggregation: Record<string, number> = {};
            let totalLbs = 0;
            let totalGuests = 0;
            let totalAmount = 0;

            for (const item of scannedItems) {
                const weight = item.lbs || 0.5 * (item.qty || 1);

                // Decompose into actual proteins
                const breakdown = await DeliveryController.decomposeMeat(item.item, weight, user.companyId);
                breakdown.forEach(b => {
                    proteinAggregation[b.protein] = (proteinAggregation[b.protein] || 0) + b.weight;
                });

                totalLbs += weight;
                totalGuests += Math.round(weight * 2); // Estimate ~0.5lb per guest
                totalAmount += item.price || 0;
            }

            const proteinBreakdownArray = Object.entries(proteinAggregation).map(([name, lbs]) => ({
                protein: name,
                lbs: parseFloat(lbs.toFixed(2))
            }));

            if (scannedItems.length === 0) {
                return res.json({ success: false, error: "No meat items detected in the image.", metrics: { totalLbs: 0, calculatedGuests: 0, amount: 0 }, proteinBreakdown: [], items: [] });
            }

            const externalId = `OCR-${Math.floor(Date.now() / 1000)}`;

            // PERSIST TO DATABASE
            await prisma.deliverySale.create({
                data: {
                    store_id: storeId,
                    source: 'OCR',
                    order_external_id: externalId,
                    total_lbs: totalLbs,
                    guests: totalGuests,
                    amount: totalAmount,
                    protein_breakdown: proteinBreakdownArray as any,
                    date: new Date()
                }
            });

            return res.json({
                success: true,
                message: "Ticket parsed with GPT-4o Vision and SAVED successfully",
                metrics: { totalLbs, calculatedGuests: totalGuests, amount: totalAmount },
                proteinBreakdown: proteinBreakdownArray,
                items: scannedItems
            });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error(`[OCR DEBUG ${requestId}] ERROR:`, error);
            return res.status(500).json({ success: false, error: 'OCR Saving Failed' });
        }
    }

    /**
     * GET /api/v1/delivery/history
     */
    static async getHistory(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { storeId } = req.query;

            const targetStoreId = storeId ? parseInt(storeId as string) : user.storeId;

            // Verify store belongs to company
            const store = await prisma.store.findFirst({
                where: { id: targetStoreId, company_id: user.companyId }
            });

            if (!store) {
                return res.status(403).json({ error: 'Access Denied: Store not found or belongs to another company.' });
            }

            const history = await prisma.deliverySale.findMany({
                where: { store_id: targetStoreId },
                orderBy: { date: 'asc' },
                take: 50
            });

            return res.json({ success: true, history });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            return res.status(500).json({ success: false, error: 'Failed to fetch history' });
        }
    }

    /**
     * GET /api/v1/delivery/network-status
     */
    static async getNetworkStatus(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const whereStore: any = {};
            if (user.companyId) {
                whereStore.company_id = user.companyId;
            }
            if (user.role !== 'admin' && user.role !== 'director') {
                if (user.role === 'area_manager') {
                    whereStore.area_manager_id = getUserId(user);
                } else {
                    whereStore.id = user.storeId;
                }
            }
            whereStore.delivery_sales = { some: {} };

            const stores = await prisma.store.findMany({
                where: whereStore,
                include: {
                    delivery_sales: {
                        take: 1,
                        orderBy: { date: 'desc' }
                    }
                }
            });

            // Aggregate metrics per store
            const networkStatus = stores.map(store => {
                const lastSale = store.delivery_sales[0];
                return {
                    id: store.id,
                    name: store.store_name,
                    // Use a slightly more lenient online check for the demo: 2 hours
                    status: (lastSale && new Date().getTime() - new Date(lastSale.date).getTime() < 2 * 3600000) ? "online" : "offline",
                    lastSync: lastSale ? `${Math.floor((new Date().getTime() - new Date(lastSale.date).getTime()) / 60000)} mins ago` : "Never",
                    totalLbs: lastSale?.total_lbs || 0,
                    deliveryCount: lastSale?.guests || 0,
                    salesValue: lastSale?.amount || 0,
                    salesTarget: store.olo_sales_target || 10000
                };
            }).slice(0, 57).sort((a, b) => b.deliveryCount - a.deliveryCount); // Sort by delivery count and limit to 57 for parity

            return res.json({ success: true, stores: networkStatus });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Failed to fetch network status:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch network status' });
        }
    }
}
