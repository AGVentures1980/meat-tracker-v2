import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireScope } from '../middleware/auth.middleware';
import bcrypt from 'bcryptjs';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/provision', requireAuth, requireScope('GLOBAL'), async (req, res) => {
    const { name, subdomain, adminEmail, initialStores } = req.body;
    
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Tenant Record
            const company = await tx.company.create({ 
                data: { name, subdomain, company_status: 'Active' } 
            });
            
            // 2. Create Global Director for Tenant
            const password_hash = await bcrypt.hash('Provisorio2026@', 10);
            const admin = await tx.user.create({
                data: { 
                    email: adminEmail, 
                    password_hash,
                    role: 'director',
                    force_change: true,
                    store: undefined // Linked virtually via auth middleware scoping logic
                }
            });
            
            // 3. Setup Initial Stores
            let stores = [];
            if (initialStores && initialStores.length > 0) {
                stores = await Promise.all(
                    initialStores.map(async (location: string) => {
                        return tx.store.create({
                            data: { 
                                store_name: location, 
                                location, 
                                company_id: company.id 
                            }
                        });
                    })
                );
            }
            
            return { company, admin, stores };
        });
        
        res.json({ success: true, result });
    } catch (error) {
        console.error("Provisioning Error", error);
        res.status(500).json({ error: 'Failed to provision tenant' });
    }
});

export default router;
