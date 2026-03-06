
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
            const { name, protein_group, is_villain, is_dinner_only, include_in_delivery, category } = req.body;

            if (user.role !== 'admin' && user.role !== 'director') {
                return res.status(403).json({ error: 'Access Denied' });
            }

            const product = await (prisma as any).companyProduct.create({
                data: {
                    company_id: user.companyId,
                    name,
                    protein_group: protein_group || null,
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
                `Added product: ${name} (Group: ${protein_group || 'none'}, Delivery: ${include_in_delivery})`,
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

    // --- AREA MANAGERS ---

    static async getAreaManagers(req: Request, res: Response) {
        try {
            const user = (req as any).user;

            if (user.role !== 'admin' && user.role !== 'director') {
                return res.status(403).json({ error: 'Access Denied' });
            }

            // Find users in this company (assuming company context via stores or direct id)
            // Currently User isn't strictly bound to Company directly, but tied via Store.
            // For directors/admins, they might not have a store_id. But Area Managers can be created 
            // and assigned stores. Let's fetch users with role 'area_manager' and their stores.

            // To properly scope to the company: find all stores for this company, 
            // then find area managers assigned to those stores. Or, just list all area managers
            // (in a multi-tenant DB without Company on User, this requires fetching via store relation or domain)

            // For MVP: Fetch users with role area_manager (simplification: assuming admin manages their own)
            const areaManagers = await prisma.user.findMany({
                where: { role: 'area_manager' }, // TODO: Add company filter if Users are strictly tenant-bound
                include: { area_stores: true },
                orderBy: { first_name: 'asc' }
            });

            // Also fetch all stores to show available vs assigned
            const allStores = await prisma.store.findMany({
                where: { company_id: user.companyId },
                orderBy: { store_name: 'asc' }
            });

            return res.json({ areaManagers, allStores });
        } catch (error) {
            console.error('Fetch Area Managers Error:', error);
            return res.status(500).json({ error: 'Failed to fetch Area Managers' });
        }
    }

    static async assignStoresToAreaManager(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { areaManagerId, storeIds } = req.body;

            if (user.role !== 'admin' && user.role !== 'director') {
                return res.status(403).json({ error: 'Access Denied' });
            }

            // Start a transaction: clear existing assignments for these stores (to ensure 1-to-N is maintained)
            // Then set the new area_manager_id

            await prisma.$transaction(async (tx) => {
                // First, disassociate this area manager from all their current stores
                await tx.store.updateMany({
                    where: { area_manager_id: areaManagerId },
                    data: { area_manager_id: null }
                });

                // Now associate them with the new list of stores
                if (storeIds && storeIds.length > 0) {
                    await tx.store.updateMany({
                        where: { id: { in: storeIds }, company_id: user.companyId },
                        data: { area_manager_id: areaManagerId }
                    });
                }
            });

            return res.json({ success: true, message: 'Stores assigned successfully' });
        } catch (error) {
            console.error('Assign Stores Error:', error);
            return res.status(500).json({ error: 'Failed to assign stores' });
        }
    }
}
