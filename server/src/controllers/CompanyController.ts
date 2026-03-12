
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../services/AuditService';
import bcrypt from 'bcryptjs';

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

            // 1. Find the default system template for the company
            const defaultTemplate = await prisma.storeTemplate.findFirst({
                where: { company_id: user.companyId, is_system: true }
            });
            const cfg = defaultTemplate ? (defaultTemplate.config as any) : null;

            // 2. Create the store linking to the base template
            const store = await prisma.store.create({
                data: {
                    company_id: user.companyId,
                    store_name,
                    location,
                    active_template_id: defaultTemplate?.id || undefined,
                    target_cost_guest: cfg?.target_cost_guest ?? 9.94,
                    target_lbs_guest: cfg?.target_lbs_guest ?? 1.76,
                    lunch_price: cfg?.lunch_price ?? 45.00,
                    dinner_price: cfg?.dinner_price ?? 65.00,
                    serves_lamb_chops_rodizio: cfg?.serves_lamb_chops_rodizio ?? true
                }
            });

            // 3. Clone all CompanyProducts into StoreMeatTargets for this store
            const companyProducts = await prisma.companyProduct.findMany({
                where: { company_id: user.companyId }
            });
            const proteinTargetsCfg = cfg?.protein_targets || {};

            for (const product of companyProducts) {
                const defaultTarget = proteinTargetsCfg[product.name] || 1.76;
                await prisma.storeMeatTarget.create({
                    data: {
                        store_id: store.id,
                        protein: product.name,
                        target: defaultTarget,
                        cost_target: null 
                    }
                });
            }

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

            if (user.role !== 'admin' && user.role !== 'director' && user.role !== 'area_manager') {
                return res.status(403).json({ error: 'Access Denied' });
            }

            // Find all stores for this company
            const allStores = await prisma.store.findMany({
                where: { company_id: user.companyId },
                orderBy: { store_name: 'asc' }
            });

            // Get the IDs of the stores that belong to this company
            const storeIds = allStores.map(s => s.id);

            // Fetch users with role area_manager who are EITHER assigned to at least one store in this company,
            // OR have an email matching the company domain as a fallback (since we don't have company_id on User directly)
            
            // To ensure strict multi-tenant boundary even for master admins who can switch companies:
            const company = await prisma.company.findUnique({ where: { id: user.companyId } });
            
            // Default to caller's domain. If they are a legitimate FDC admin, their email is @fogo.com.
            let companyDomain = user.email.split('@')[1]; 
            
            // Master admin explicitly should not leak their own domain users as fallback orphans
            if (companyDomain === 'alexgarciaventures.co') {
                if (company?.name.toLowerCase().includes('fogo')) {
                    companyDomain = 'fogo.com';
                } else if (company?.name.toLowerCase().includes('texas')) {
                    companyDomain = 'texasdebrazil.com';
                } else {
                    companyDomain = 'NONE_MASTER_FALLBACK'; 
                }
            }

            const areaManagers = await prisma.user.findMany({
                where: { 
                    role: 'area_manager',
                    OR: [
                        { store_id: { in: storeIds } }, // Primary store belongs to company
                        { area_stores: { some: { id: { in: storeIds } } } }, // Managing a store belonging to company
                        { email: { endsWith: '@' + companyDomain } } // Unassigned managers mapped by domain
                    ]
                },
                include: { area_stores: true },
                orderBy: { first_name: 'asc' }
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

    static async addAreaManager(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { email, password, first_name, last_name } = req.body;

            if (user.role !== 'admin' && user.role !== 'director') {
                return res.status(403).json({ error: 'Access Denied' });
            }

            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
                return res.status(400).json({ error: 'Email already in use' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const am = await prisma.user.create({
                data: {
                    email,
                    password_hash: hashedPassword,
                    first_name,
                    last_name,
                    role: 'area_manager',
                    // Note: Since User currently lacks company_id directly, they are strictly scoped 
                    // by their email domain and/or the store associations in getAreaManagers
                }
            });

            await AuditService.logAction(
                user.id,
                'CREATE',
                'Area Manager',
                `Added Area Manager: ${first_name} ${last_name} (${email})`,
                0
            );

            return res.json({ success: true, user: { id: am.id, email: am.email, first_name: am.first_name, last_name: am.last_name } });
        } catch (error) {
            console.error('Add Area Manager Error:', error);
            return res.status(500).json({ error: 'Failed to add area manager' });
        }
    }

    static async deleteAreaManager(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { id } = req.params;

            if (user.role !== 'admin' && user.role !== 'director') {
                return res.status(403).json({ error: 'Access Denied' });
            }

            const am = await prisma.user.findUnique({ where: { id } });
            if (!am || am.role !== 'area_manager') {
                return res.status(404).json({ error: 'Area manager not found' });
            }

            // Unassign stores
            await prisma.store.updateMany({
                where: { area_manager_id: id },
                data: { area_manager_id: null }
            });

            await prisma.user.delete({ where: { id } });

            await AuditService.logAction(
                user.id,
                'DELETE',
                'Area Manager',
                `Deleted Area Manager: ${am.first_name} ${am.last_name}`,
                0
            );

            return res.json({ success: true });
        } catch (error) {
            console.error('Delete Area Manager Error:', error);
            return res.status(500).json({ error: 'Failed to delete area manager' });
        }
    }
}
