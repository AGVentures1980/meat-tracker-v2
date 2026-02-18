import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../services/AuditService';

const prisma = new PrismaClient();

const PROTEIN_TARGETS_DEFAULT = {
    'Beef Ribs': 0.12,
    'Filet Mignon': 0.15,
    'Picanha': 0.14,
    'Fraldinha': 0.13,
    'Chicken': 0.07,
    'Lamb Chops': 0.05,
    'Sirloin': 0.08,
    'Sausage': 0.04,
    'Pork Ribs': 0.06,
    'Pork Loin': 0.05
};

export class TemplateController {

    /** GET /api/v1/dashboard/company/templates */
    static async listTemplates(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const templates = await (prisma as any).storeTemplate.findMany({
                where: { company_id: user.companyId },
                orderBy: [{ is_system: 'desc' }, { name: 'asc' }]
            });
            return res.json(templates);
        } catch (error) {
            console.error('List Templates Error:', error);
            return res.status(500).json({ error: 'Failed to list templates' });
        }
    }

    /** POST /api/v1/dashboard/company/templates — director/admin only */
    static async createTemplate(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (user.role !== 'admin' && user.role !== 'director') {
                return res.status(403).json({ error: 'Access Denied' });
            }
            const { name, description, config } = req.body;
            if (!name || !config) {
                return res.status(400).json({ error: 'name and config are required' });
            }
            const template = await (prisma as any).storeTemplate.create({
                data: {
                    company_id: user.companyId,
                    name,
                    description: description || null,
                    config,
                    is_system: false
                }
            });
            await AuditService.logAction(user.userId, 'CREATE', 'StoreTemplate', `Created template: ${name}`, 0);
            return res.json(template);
        } catch (error) {
            console.error('Create Template Error:', error);
            return res.status(500).json({ error: 'Failed to create template' });
        }
    }

    /** POST /api/v1/dashboard/company/stores/:id/apply-template — manager/director/admin */
    static async applyTemplate(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const storeId = parseInt(req.params.id);
            const { template_id } = req.body;

            if (!template_id) {
                return res.status(400).json({ error: 'template_id is required' });
            }

            // RBAC: managers can only apply to their own store
            if (user.role === 'manager' && user.storeId !== storeId) {
                return res.status(403).json({ error: 'Access Denied: You can only apply templates to your own store' });
            }
            if (user.role === 'viewer') {
                return res.status(403).json({ error: 'Access Denied' });
            }

            // Fetch template and verify it belongs to the same company
            const template = await (prisma as any).storeTemplate.findFirst({
                where: { id: template_id, company_id: user.companyId }
            });
            if (!template) {
                return res.status(404).json({ error: 'Template not found' });
            }

            const cfg = template.config as any;

            // 1. Update Store fields
            await (prisma as any).store.update({
                where: { id: storeId },
                data: {
                    target_lbs_guest: cfg.target_lbs_guest ?? undefined,
                    target_cost_guest: cfg.target_cost_guest ?? undefined,
                    lunch_price: cfg.lunch_price ?? undefined,
                    dinner_price: cfg.dinner_price ?? undefined,
                    serves_lamb_chops_rodizio: cfg.serves_lamb_chops_rodizio ?? undefined,
                    active_template_id: template_id
                }
            });

            // 2. Upsert StoreMeatTarget rows for each protein in config
            if (cfg.protein_targets && typeof cfg.protein_targets === 'object') {
                for (const [protein, target] of Object.entries(cfg.protein_targets)) {
                    await (prisma as any).storeMeatTarget.upsert({
                        where: { store_id_protein: { store_id: storeId, protein } },
                        update: { target: target as number },
                        create: { store_id: storeId, protein, target: target as number }
                    });
                }
            }

            // 3. Audit log
            await AuditService.logAction(
                user.userId,
                'APPLY_TEMPLATE',
                'Store',
                `Applied template "${template.name}" to store ${storeId}`,
                storeId
            );

            return res.json({ success: true, template_name: template.name, store_id: storeId });
        } catch (error) {
            console.error('Apply Template Error:', error);
            return res.status(500).json({ error: 'Failed to apply template' });
        }
    }
}
