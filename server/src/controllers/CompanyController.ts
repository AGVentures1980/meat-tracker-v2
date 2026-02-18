
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../services/AuditService';

const prisma = new PrismaClient();

export class CompanyController {

    // --- PRODUCTS ---

    static async getProducts(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const data = await (prisma as any).companyProduct.findMany({
                where: { company_id: user.companyId },
                orderBy: { name: 'asc' }
            });
            return res.json(data);
        } catch (error) {
            console.error('Create Product Error:', error);
            return res.status(500).json({ error: 'Failed to fetch products' });
        }
    }

    static async addProduct(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { name, is_villain, is_dinner_only, include_in_delivery, category } = req.body;

            if (user.role !== 'admin' && user.role !== 'director') {
                return res.status(403).json({ error: 'Access Denied' });
            }

            const product = await (prisma as any).companyProduct.create({
                data: {
                    company_id: user.companyId,
                    name,
                    category: category || 'General',
                    is_villain: is_villain || false,
                    is_dinner_only: is_dinner_only || false,
                    include_in_delivery: include_in_delivery || false
                }
            });

            await AuditService.logAction(
                user.id,
                'CREATE',
                'Product',
                `Added product: ${name} (Delivery: ${include_in_delivery})`,
                0 // Company Level
            );

            return res.json(product);
        } catch (error) {
            console.error('Create Product Error:', error);
            return res.status(500).json({ error: 'Failed to create product' });
        }
    }

    static async deleteProduct(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { id } = req.params;

            if (user.role !== 'admin' && user.role !== 'director') {
                return res.status(403).json({ error: 'Access Denied' });
            }

            // Verify ownership
            const existing = await (prisma as any).companyProduct.findFirst({
                where: { id, company_id: user.companyId }
            });

            if (!existing) return res.status(404).json({ error: 'Product not found' });

            await (prisma as any).companyProduct.delete({ where: { id } });

            await AuditService.logAction(
                user.id,
                'DELETE',
                'Product',
                `Deleted product: ${existing.name}`,
                0
            );

            return res.json({ success: true });
        } catch (error) {
            console.error('Delete Product Error:', error);
            return res.status(500).json({ error: 'Failed to delete product' });
        }
    }

    // --- STORES ---

    static async getStores(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const data = await prisma.store.findMany({
                where: { company_id: user.companyId },
                orderBy: { store_name: 'asc' }
            });
            return res.json(data);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch stores' });
        }
    }

    static async addStore(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { store_name, location } = req.body;

            if (user.role !== 'admin' && user.role !== 'director') {
                return res.status(403).json({ error: 'Access Denied' });
            }

            const store = await prisma.store.create({
                data: {
                    company_id: user.companyId,
                    store_name,
                    location,
                    target_cost_guest: 9.94, // Default
                    target_lbs_guest: 1.76
                }
            });

            await AuditService.logAction(
                user.id,
                'CREATE',
                'Store',
                `Added store: ${store_name}`,
                store.id
            );

            return res.json(store);

        } catch (error) {
            console.error('Add Store Error:', error);
            return res.status(500).json({ error: 'Failed to add store' });
        }
    }

    static async deleteStore(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { id } = req.params;

            if (user.role !== 'admin' && user.role !== 'director') {
                return res.status(403).json({ error: 'Access Denied' });
            }

            // Verify ownership
            const existing = await prisma.store.findFirst({
                where: { id: parseInt(id), company_id: user.companyId }
            });

            if (!existing) return res.status(404).json({ error: 'Store not found' });

            // TODO: Adding Cascade delete warning or logic?
            // For now, we will just delete the store record.
            await prisma.store.delete({ where: { id: parseInt(id) } });

            await AuditService.logAction(
                user.id,
                'DELETE',
                'Store',
                `Deleted store: ${existing.store_name}`,
                existing.id
            );

            return res.json({ success: true });
        } catch (error) {
            console.error('Delete Store Error:', error);
            return res.status(500).json({ error: 'Failed to delete store' });
        }
    }
}
