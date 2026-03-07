import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VAULT_PIN = '452310';

export class VaultController {
    /**
     * POST /api/v1/vault/verify
     * Validates the Owner Vault PIN.
     */
    static async verifyPin(req: Request, res: Response) {
        try {
            const { pin } = req.body;

            if (pin === VAULT_PIN) {
                return res.json({ success: true });
            } else {
                return res.status(401).json({ success: false, error: 'Invalid PIN' });
            }
        } catch (error) {
            console.error('Vault PIN verification error:', error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    /**
     * GET /api/v1/vault/messages
     * Fetches all vault messages and marks them as read by the OWNER.
     */
    static async getMessages(req: Request, res: Response) {
        try {
            const messages = await prisma.ownerVaultMessage.findMany({
                orderBy: { created_at: 'asc' }
            });

            // Mark any unread system/AI messages as read since the vault is now open
            await prisma.ownerVaultMessage.updateMany({
                where: { is_read: false, sender: { not: 'OWNER' } },
                data: { is_read: true }
            });

            return res.json({ success: true, messages });
        } catch (error) {
            console.error('Error fetching vault messages:', error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    /**
     * GET /api/v1/vault/unread
     * Fetches the count of unread system/AI messages.
     */
    static async getUnreadCount(req: Request, res: Response) {
        try {
            const count = await prisma.ownerVaultMessage.count({
                where: { is_read: false, sender: { not: 'OWNER' } }
            });
            return res.json({ success: true, count });
        } catch (error) {
            console.error('Error counting unread vault messages:', error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    /**
     * POST /api/v1/vault/messages
     * Creates a new vault message from the Owner, optionally with a file.
     */
    static async postMessage(req: Request, res: Response) {
        try {
            const { text } = req.body;
            const file = req.file;

            if ((!text || text.trim() === '') && !file) {
                return res.status(400).json({ success: false, error: 'Message text or file is required' });
            }

            let file_url = null;
            let file_name = null;
            let file_type = null;

            if (file) {
                // Convert buffer to Base64 Data URI for simple generic storage
                const base64Str = file.buffer.toString('base64');
                file_url = `data:${file.mimetype};base64,${base64Str}`;
                file_name = file.originalname;
                file_type = file.mimetype;
            }

            const message = await prisma.ownerVaultMessage.create({
                data: {
                    text: text ? text.trim() : null,
                    file_url,
                    file_name,
                    file_type,
                    sender: 'OWNER'
                }
            });

            // --- REAL AI INTEGRATION: Conversation History & OpenAI API ---
            let aiResponseText = "Estou processando sua ideia. (A chave da OpenAI não está disponível no servidor.)";

            if (process.env.OPENAI_API_KEY) {
                try {
                    // Fetch last 6 messages to provide conversational context
                    const recentMessages = await prisma.ownerVaultMessage.findMany({
                        take: 6,
                        orderBy: { created_at: 'desc' }
                    });

                    const chatHistory = recentMessages.reverse().map(msg => ({
                        role: msg.sender === 'OWNER' ? 'user' : 'assistant',
                        content: msg.text || '(Attachment sent)'
                    }));

                    const systemPrompt = {
                        role: "system",
                        content: `Você é o 'AGV AI OS', um conselheiro executivo hiper-inteligente embarcado no Brasa Meat Intelligence, especializado na operação, CMV (Food Cost) e fluxo de caixa da rede de restaurantes de carnes. O usuário interagindo com você agora é o Alexandre Garcia, dono da rede.
Sua missão:
1. Analise ideias operacionais através da lente do Custo de Mercadoria Vendida (CMV).
2. Reforce sempre a "Garcia Rule" (responsabilidade inegociável do inventário semanal para evitar perdas).
3. Avalie a viabilidade das ideias focando em Shelf-life (tempo de prateleira) e redução de desperdícios (Spoilage).
4. Seja direto, executivo e tático. Pergunte como a ideia se aplica na prática (ex: 'Isso afeta a Picanha ou a Fraldinha?').
Comporte-se como um co-piloto focado em lucro, identificando gargalos antes que eles aconteçam.`
                    };

                    const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: "gpt-4o-mini",
                            messages: [systemPrompt, ...chatHistory],
                            temperature: 0.7,
                            max_tokens: 300
                        })
                    });

                    if (openAiRes.ok) {
                        const aiData: any = await openAiRes.json();
                        aiResponseText = aiData.choices[0].message.content;
                    } else {
                        console.error("OpenAI Error:", await openAiRes.text());
                        aiResponseText = "Houve um problema ao conectar com a minha base de dados central (Erro OpenAI). Vamos focar no básico por enquanto.";
                    }
                } catch (aiErr) {
                    console.error("AI Fetch execution failed", aiErr);
                    aiResponseText = "Não consegui concluir a análise agora. O sistema pode estar offline.";
                }
            }

            const aiMessage = await prisma.ownerVaultMessage.create({
                data: {
                    text: aiResponseText,
                    file_url: null,
                    file_name: null,
                    file_type: null,
                    sender: 'AI_AGENT'
                }
            });

            return res.json({ success: true, message, ai_message: aiMessage });
        } catch (error) {
            console.error('Error posting vault message:', error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    /**
     * GET /api/v1/vault/sync
     * Machine-to-machine endpoint for the AI Agent to fetch messages locally.
     * Protected by AGV_AGENT_SECRET.
     */
    static async agentSync(req: Request, res: Response) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }

            const token = authHeader.split(' ')[1];
            const secret = process.env.AGV_AGENT_SECRET || 'agv-local-agent-sync-key-v1';

            if (token !== secret) {
                return res.status(403).json({ success: false, error: 'Forbidden' });
            }

            const messages = await prisma.ownerVaultMessage.findMany({
                orderBy: { created_at: 'asc' }
            });

            return res.json({ success: true, messages });
        } catch (error) {
            console.error('Error in agent sync:', error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }
}
