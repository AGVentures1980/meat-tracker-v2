import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SettingsController {
    static async getSettings(req: Request, res: Response) {
        try {
            const settings = await prisma.systemSettings.findMany();
            return res.json(settings);
        } catch (error) {
            console.error('Fetch Settings Error:', error);
            return res.status(500).json({ error: 'Failed to fetch settings' });
        }
    }

    static async updateSettings(req: Request, res: Response) {
        try {
            const { settings } = req.body; // Array of { key: string, value: string, type: string }
            const user = (req as any).user;

            if (!Array.isArray(settings)) {
                return res.status(400).json({ error: 'Invalid format. Expected array.' });
            }

            for (const s of settings) {
                await prisma.systemSettings.upsert({
                    where: { key: s.key },
                    update: { value: s.value, type: s.type },
                    create: { key: s.key, value: s.value, type: s.type }
                });

                // Audit log
                await prisma.auditLog.create({
                    data: {
                        user_id: user.id,
                        action: 'UPDATE_SETTING',
                        resource: s.key,
                        details: { oldValue: '...', newValue: s.value }
                    }
                });
            }

            return res.json({ message: 'Settings updated successfully' });
        } catch (error) {
            console.error('Update Settings Error:', error);
            return res.status(500).json({ error: 'Failed to update settings' });
        }
    }
}
