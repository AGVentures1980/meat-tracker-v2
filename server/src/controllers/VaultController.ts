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
     * Fetches all vault messages.
     */
    static async getMessages(req: Request, res: Response) {
        try {
            const messages = await prisma.ownerVaultMessage.findMany({
                orderBy: { created_at: 'asc' }
            });

            return res.json({ success: true, messages });
        } catch (error) {
            console.error('Error fetching vault messages:', error);
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

            return res.json({ success: true, message });
        } catch (error) {
            console.error('Error posting vault message:', error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }
}
