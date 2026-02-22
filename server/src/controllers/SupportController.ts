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
                        { question: 'Como vejo o rendimento da Picanha?', answer: 'Vá na aba "Operations" e clique na linha correspondente à loja. Os dados detalhados aparecerão à direita no painel de métricas.', category: 'Reports', frequency_count: 5 },
                        { question: 'Como preencho minha perda de almoço?', answer: 'Entre no "Dashboard" durante o turno do almoço e o botão "Process Waste" estará verde e liberado para entrada.', category: 'Operations', frequency_count: 8 },
                        { question: 'O que é a "Regra do Garcia"?', answer: 'É o bloqueio automático de tela caso o inventário semanal não seja submetido até SEGUNDA 11h da manhã.', category: 'Policy', frequency_count: 3 },
                        { question: 'Como adiciono um novo usuário?', answer: 'Apenas Administradores de Empresa podem adicionar usuários no Hub de Governança corporativa.', category: 'Access', frequency_count: 2 },
                        { question: 'Onde vejo o ROI simulado?', answer: 'Selecione "Financials & ROI" no painel principal; a economia projetada e a perda de oportunidade são exibidas em tempo real.', category: 'Reports', frequency_count: 4 }
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
            const { content } = req.body;
            // The Auth Middleware injects `req.user` theoretically
            // For now, assume auth works and user is attached
            const user_id = (req as any).user?.id || 'demo-user-id';
            const store_id = (req as any).user?.store_id || 1;

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

            if (lowerContent.includes('bug') || lowerContent.includes('erro') || lowerContent.includes('não funciona') || lowerContent.includes('ajuda')) {
                aiResponse = 'Entendido. Detectei que isso pode ser um problema técnico. Estou escalando este chamado imediatamente para o Centro de Comando Executivo (Alex Garcia). Ele será notificado e responderá por aqui em breve.';
                escalate = true;
            } else if (lowerContent.includes('relatório') || lowerContent.includes('roi')) {
                aiResponse = 'Para ler os relatórios de ROI, acesse a aba "Financials & ROI" no menu esquerdo. Lá você verá o impacto projetado baseado no consumo real vs baseline. Essa resposta ajudou?';
            } else if (lowerContent.includes('inventário') || lowerContent.includes('pulso')) {
                aiResponse = 'O Inventário Semanal (Weekly Pulse) deve ser feito fisicamente e inserido na plataforma até as 11:00 AM de Segunda-feira. Cuidado com a Regra do Garcia!';
            } else {
                aiResponse = 'Olá! Sou o AGV Support Agent. Se precisar de assistência técnica avançada, diga "preciso de ajuda" e eu chamarei a Diretoria. O que precisa hoje?';
            }

            // 5. Save AI Reply
            const aiMessage = await prisma.supportMessage.create({
                data: {
                    ticket_id: ticket.id,
                    sender_type: 'AI',
                    content: aiResponse
                }
            });

            // If it's escalated, we keep it OPEN. If it was just an FAQ, maybe we do nothing or auto-close?
            // For now, keep OPEN so Admin can always see history.

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
            const store_id = (req as any).user?.store_id || 1;

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
                where: { status: 'OPEN' },
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
