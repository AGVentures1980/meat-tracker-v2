import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SupportController {

    // --- STORE MANAGER ENDPOINTS ---

    static async getFaqs(req: Request, res: Response) {
        try {
            // Wait, I should seed some FAQs if they don't exist
            const faqCount = await prisma.fAQ.count();
            if (faqCount === 0) {
                await prisma.fAQ.createMany({
                    data: [
                        { question: 'My system is frozen or broken, what do I do?', answer: 'Type "I need help" or "error" in this chat to immediately escalate your issue to the Executive Command Center.', category: 'Tech Support', frequency_count: 5 },
                        { question: 'How do I submit my Weekly Pulse Inventory?', answer: 'Go to the Dashboard and click the Weekly Pulse icon. It must be counted and submitted by 11:00 AM every Monday.', category: 'Operations', frequency_count: 8 },
                        { question: 'I forgot to log lunch waste, can I do it now?', answer: 'If the shift is closed, you must escalate to an Executive Admin to unlock your historical daily waste logs.', category: 'Operations', frequency_count: 3 },
                        { question: 'Where do I find my Picanha consumption data?', answer: 'Navigate to the Performance Hub on the left menu. You will find a detailed breakdown of all protein usage vs theoretical baseline.', category: 'Reports', frequency_count: 4 },
                        { question: 'How do I view the projected ROI impact?', answer: 'Access the "Data Analyst" or "Executive Reports" tab to view real-time savings and opportunity loss metrics.', category: 'Reports', frequency_count: 2 }
                    ]
                });
            }

            const faqs = await prisma.fAQ.findMany({
                orderBy: { frequency_count: 'desc' },
                take: 6
            });

            res.json(faqs);
        } catch (error) {
            console.error('Failed to get FAQs', error);
            res.status(500).json({ error: 'Failed to load FAQs' });
        }
    }

    static async sendMessage(req: Request, res: Response) {
        try {
            const { content, store_id: bodyStoreId } = req.body;
            // The Auth Middleware injects `req.user` theoretically
            const userId = (req as any).user?.userId || (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: 'User context required' });
            const user_id = userId;
            let store_id = bodyStoreId ? parseInt(bodyStoreId, 10) : (req as any).user?.storeId;
            if (!store_id) {
                const firstStore = await prisma.store.findFirst();
                store_id = firstStore?.id || 1;
            }

            if (!content) return res.status(400).json({ error: 'Message content required' });

            // 1. See if there is an OPEN ticket for this store
            let ticket = await prisma.supportTicket.findFirst({
                where: { store_id, status: 'OPEN' }
            });

            // 2. If not, create one
            if (!ticket) {
                ticket = await prisma.supportTicket.create({
                    data: {
                        store_id,
                        user_id,
                        title: content.length > 30 ? content.substring(0, 30) + '...' : content,
                    }
                });
            }

            // 3. Save User Message
            await prisma.supportMessage.create({
                data: {
                    ticket_id: ticket.id,
                    sender_type: 'USER',
                    content
                }
            });

            // 4. AI SIMULATION LOGIC
            const lowerContent = content.toLowerCase();
            let aiResponse = '';
            let escalate = false;

            if (lowerContent.includes('bug') || lowerContent.includes('error') || lowerContent.includes('broken') || lowerContent.includes('help')) {
                aiResponse = 'Understood. I have detected this may be a technical issue. I am immediately escalating this ticket to the Executive Command Center (Alex Garcia). You will be notified and receive a response here shortly.';
                escalate = true;

                await prisma.supportTicket.update({
                    where: { id: ticket.id },
                    data: { is_escalated: true }
                });
            } else if (lowerContent.includes('report') || lowerContent.includes('roi')) {
                aiResponse = 'To read the ROI reports, access the "Financials & ROI" tab on the left menu. There you will see the projected impact based on actual consumption vs baseline. Did this answer help?';
            } else if (lowerContent.includes('inventory') || lowerContent.includes('pulse') || lowerContent.includes('count')) {
                aiResponse = 'The Weekly Smart Inventory (Pulse) must be physically counted and entered into the platform by 11:00 AM on Monday. Beware of The Garcia Rule!';
            } else {
                aiResponse = `Hello, how can I help you today? Let's get started.`;
            }

            // 5. Save AI Reply
            const aiMessage = await prisma.supportMessage.create({
                data: {
                    ticket_id: ticket.id,
                    sender_type: 'AI',
                    content: aiResponse
                }
            });

            // 6. Return the updated thread
            const updatedThread = await prisma.supportMessage.findMany({
                where: { ticket_id: ticket.id },
                orderBy: { created_at: 'asc' }
            });

            res.json({ ticketId: ticket.id, messages: updatedThread, isEscalated: escalate });

        } catch (error) {
            console.error('Failed to process message', error);
            res.status(500).json({ error: 'Failed to process message' });
        }
    }

    static async getStoreThread(req: Request, res: Response) {
        try {
            const queryStoreId = req.query.store_id as string;
            let store_id = queryStoreId ? parseInt(queryStoreId, 10) : (req as any).user?.store_id;

            if (!store_id) {
                const firstStore = await prisma.store.findFirst();
                store_id = firstStore?.id || 1;
            }

            const ticket = await prisma.supportTicket.findFirst({
                where: { store_id, status: 'OPEN' },
                include: { messages: { orderBy: { created_at: 'asc' } } }
            });

            res.json(ticket ? ticket.messages : []);
        } catch (error) {
            console.error('Failed to load thread', error);
            res.status(500).json({ error: 'Failed to load thread' });
        }
    }

    // --- ADMIN / EXECUTIVE ENDPOINTS ---

    static async getActiveTickets(req: Request, res: Response) {
        try {
            // Admin only
            const tickets = await prisma.supportTicket.findMany({
                where: { status: 'OPEN', is_escalated: true },
                include: {
                    store: { select: { store_name: true, location: true } },
                    user: { select: { first_name: true, last_name: true, email: true } },
                    messages: { orderBy: { created_at: 'asc' } }
                },
                orderBy: { updated_at: 'desc' }
            });

            res.json(tickets);
        } catch (error) {
            console.error('Failed to open tickets', error);
            res.status(500).json({ error: 'Failed to fetch active tickets' });
        }
    }

    static async adminReply(req: Request, res: Response) {
        try {
            const { ticketId } = req.params;
            const { content, resolve } = req.body;

            const message = await prisma.supportMessage.create({
                data: {
                    ticket_id: ticketId,
                    sender_type: 'ADMIN',
                    content
                }
            });

            if (resolve) {
                await prisma.supportTicket.update({
                    where: { id: ticketId },
                    data: { status: 'RESOLVED' }
                });
            } else {
                await prisma.supportTicket.update({
                    where: { id: ticketId },
                    data: { updated_at: new Date() } // Touch ticket to bump it
                });
            }

            res.json(message);
        } catch (error) {
            console.error('Admin reply failed', error);
            res.status(500).json({ error: 'Failed to send admin reply' });
        }
    }
}
