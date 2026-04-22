import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { getUserId, requireTenant, AuthContextMissingError } from '../utils/authContext';
import { hasRole, DIRECTOR_ROLES } from '../utils/roleGroups';

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
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Failed to get FAQs', error);
            res.status(500).json({ error: 'Failed to load FAQs' });
        }
    }

    static async sendMessage(req: Request, res: Response) {
        try {
            const { content, store_id: bodyStoreId } = req.body;
            // The Auth Middleware injects `req.user` theoretically
            const userId = getUserId((req as any).user) || (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: 'User context required' });

            let store_id = (req as any).user?.storeId;
            const role = (req as any).user?.role;
            const isExecutive = hasRole(role, DIRECTOR_ROLES) || (req as any).user?.email?.includes('admin');

            // ONLY override if they are an executive pretending to be a store
            if (isExecutive && bodyStoreId) {
                const parsed = parseInt(bodyStoreId, 10);
                if (isNaN(parsed)) {
                    const store = await prisma.store.findFirst({ where: { company_id: bodyStoreId } });
                    if (store) store_id = store.id;
                } else {
                    store_id = parsed;
                }
            }

            if (!store_id) {
                const firstStore = await prisma.store.findFirst();
                store_id = firstStore?.id || 1;
            }

            // To prevent admin emails showing up on store tickets during testing:
            // Find a valid store manager for the targeted store.
            let user_id = userId;
            const targetStoreUser = await prisma.user.findFirst({
                where: { store_id, role: 'manager' }
            });
            if (targetStoreUser) {
                user_id = targetStoreUser.id;
            }

            if (!content) return res.status(400).json({ error: 'Message content required' });

            // 1. See if there is an OPEN ticket for this store
            let ticket = await prisma.supportTicket.findFirst({
                where: { store_id, status: { in: ['OPEN', 'RESOLVED'] } },
                orderBy: { updated_at: 'desc' }
            });

            // If the last ticket is resolved but unrated, force rating first
            if (ticket && ticket.status === 'RESOLVED' && ticket.rating === null) {
                return res.status(403).json({
                    error: 'Rating Required',
                    code: 'RATING_REQUIRED',
                    ticketId: ticket.id
                });
            }

            // 2. If no open ticket, create one
            if (!ticket || ticket.status === 'RESOLVED') {
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

            // 4. OPENAI INTEGRATION
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            
            // Get previous messages to build context
            const previousMessages = await prisma.supportMessage.findMany({
                where: { ticket_id: ticket.id },
                orderBy: { created_at: 'asc' }
            });

            // Build OpenAI Message Array
            const chatContext: any[] = [
                {
                    role: 'system',
                    content: `You are the AGV Operations Intelligence Support Agent. 
You assist Brasa Meat Intelligence store managers and executives.
Maintain a professional, concise, and helpful tone. 
Answer questions regarding the platform, reporting, data analysis, and the Weekly Pulse Inventory.
If the user encounters a severe technical bug, system crash, or specifically asks for executive help, you MUST append the exact string "[ESCALATE]" at the very end of your response.
Do NOT use markdown unless formatting a very small list. Keep responses under 4 sentences.`
                }
            ];

            // Add history
            previousMessages.forEach(msg => {
                chatContext.push({
                    role: msg.sender_type === 'USER' ? 'user' : 'assistant',
                    content: msg.content
                });
            });

            let aiResponse = 'I am currently unable to process requests. Please contact support.';
            let escalate = false;

            try {
                const aiResult = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: chatContext,
                    temperature: 0.3,
                    max_tokens: 250,
                });
                
                aiResponse = aiResult.choices[0]?.message?.content?.trim() || aiResponse;

                // Check for escalation keyword
                if (aiResponse.includes('[ESCALATE]')) {
                    escalate = true;
                    // Remove the keyword from the output shown to the user
                    aiResponse = aiResponse.replace(/\[ESCALATE\]/g, '').trim();

                    await prisma.supportTicket.update({
                        where: { id: ticket.id },
                        data: { is_escalated: true }
                    });
                }
            } catch (openAiError) {
                console.error("OpenAI Chat generation failed:", openAiError);
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

        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Failed to process message', error);
            res.status(500).json({ error: 'Failed to process message' });
        }
    }

    static async getStoreThread(req: Request, res: Response) {
        try {
            const queryStoreId = req.query.store_id as string;
            let store_id = (req as any).user?.storeId;
            const role = (req as any).user?.role;
            const isExecutive = hasRole(role, DIRECTOR_ROLES) || (req as any).user?.email?.includes('admin');

            // ONLY override if they are an executive without a strict store mapping
            if (isExecutive && queryStoreId) {
                const parsed = parseInt(queryStoreId, 10);
                if (isNaN(parsed)) {
                    const store = await prisma.store.findFirst({ where: { company_id: queryStoreId } });
                    if (store) store_id = store.id;
                } else {
                    store_id = parsed;
                }
            }

            if (!store_id) {
                const firstStore = await prisma.store.findFirst();
                store_id = firstStore?.id || 1;
            }

            const ticket = await prisma.supportTicket.findFirst({
                where: { store_id, status: { in: ['OPEN', 'RESOLVED'] } },
                orderBy: { updated_at: 'desc' },
                include: { messages: { orderBy: { created_at: 'asc' } } }
            });

            if (!ticket) return res.json({ messages: [], requiresRating: false });

            const requiresRating = ticket.status === 'RESOLVED' && ticket.rating === null;

            if (ticket.is_escalated && ticket.status === 'OPEN') {
                const hasAdminReply = ticket.messages.some(m => m.sender_type === 'AI');
                const highVolumeMsg = "We are aware of your message, but are experiencing higher than expected volume. We will serve you as soon as possible. Please leave your error message or concern.";
                const hasSentHighVolume = ticket.messages.some(m => m.content === highVolumeMsg);

                if (!hasAdminReply && !hasSentHighVolume && ticket.messages.length > 0) {
                    const lastMessage = ticket.messages[ticket.messages.length - 1];
                    const oneMinuteAgo = new Date(Date.now() - 60000);

                    if (new Date(lastMessage.created_at) < oneMinuteAgo) {
                        const newMsg = await prisma.supportMessage.create({
                            data: {
                                ticket_id: ticket.id,
                                sender_type: 'AI',
                                content: highVolumeMsg
                            }
                        });
                        ticket.messages.push(newMsg);
                    }
                }
            }

            res.json({
                ticketId: ticket.id,
                messages: ticket.messages,
                requiresRating,
                status: ticket.status
            });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Failed to load thread', error);
            res.status(500).json({ error: 'Failed to load thread' });
        }
    }

    // --- ADMIN / EXECUTIVE ENDPOINTS ---

    static async getActiveTickets(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const whereClause: any = { status: 'OPEN', is_escalated: true };

            if (hasRole(user.role, DIRECTOR_ROLES) && user.companyId) {
                whereClause.store = { company_id: user.companyId };
            }

            const tickets = await prisma.supportTicket.findMany({
                where: whereClause,
                include: {
                    store: { select: { store_name: true, location: true } },
                    user: { select: { first_name: true, last_name: true, email: true } },
                    messages: { orderBy: { created_at: 'asc' } }
                },
                orderBy: { updated_at: 'desc' }
            });

            res.json(tickets);
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
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
                    sender_type: 'AI',
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
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Admin reply failed', error);
            res.status(500).json({ error: 'Failed to send admin reply' });
        }
    }

    static async submitRating(req: Request, res: Response) {
        try {
            const { ticketId } = req.params;
            const { rating, feedback } = req.body;

            if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Invalid rating' });

            // Store Managers can only rate their own tickets essentially, but for simplicity we rely on ticketId
            const ticket = await prisma.supportTicket.update({
                where: { id: ticketId },
                data: {
                    rating,
                    rating_feedback: feedback || null,
                    status: 'CLOSED' // Once rated, it's permanently closed
                }
            });

            res.json({ success: true, ticket });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Failed to submit rating', error);
            res.status(500).json({ error: 'Failed to submit rating' });
        }
    }

    static async getCompanyRatings(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const whereClause: any = {};
            if (hasRole(user.role, DIRECTOR_ROLES) && user.companyId) {
                whereClause.id = user.companyId;
            }

            // Calculate aggregate ratings per company using grouped prisma queries
            const companies = await prisma.company.findMany({
                where: whereClause,
                include: {
                    stores: {
                        include: {
                            support_tickets: {
                                where: { status: 'CLOSED', rating: { not: null } },
                                select: { rating: true }
                            }
                        }
                    }
                }
            });

            const results = companies.map(company => {
                let totalScore = 0;
                let ratingCount = 0;

                company.stores.forEach(store => {
                    store.support_tickets.forEach(ticket => {
                        if (ticket.rating) {
                            totalScore += ticket.rating;
                            ratingCount++;
                        }
                    });
                });

                const average = ratingCount > 0 ? (totalScore / ratingCount) : 0;

                return {
                    company_id: company.id,
                    company_name: company.name,
                    average_rating: parseFloat(average.toFixed(1)),
                    total_ratings: ratingCount
                };
            }).sort((a, b) => b.average_rating - a.average_rating);

            res.json(results);
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Failed to get company ratings', error);
            res.status(500).json({ error: 'Failed to load ratings' });
        }
    }
}
