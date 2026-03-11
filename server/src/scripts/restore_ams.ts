import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function restoreFdcAreaManagers() {
    try {
        console.log('--- RESTORING FDC AREA MANAGERS ---');
        
        // Fogo De Chao Company ID lookup
        const fdcCompany = await prisma.company.findFirst({
            where: { name: { contains: 'Fogo' } }
        });
        
        if (!fdcCompany) {
            console.error('Fogo de Chao company not found!');
            return;
        }

        const passwordHash = await bcrypt.hash('Fogo2026@', 10);

        const areaManagers = [
            { email: 'elias@fogo.com', firstName: 'Elias', lastName: '' },
            { email: 'rodrigo@fogo.com', firstName: 'Rodrigo', lastName: '' },
            { email: 'alirio@fogo.com', firstName: 'Alirio', lastName: '' },
            { email: 'alex@fogo.com', firstName: 'Alex', lastName: '' },
            { email: 'bruno@fogo.com', firstName: 'Bruno', lastName: '' },
            { email: 'eduardo@fogo.com', firstName: 'Eduardo', lastName: '' }
        ];

        for (const am of areaManagers) {
            const user = await prisma.user.upsert({
                where: { email: am.email },
                update: {
                    role: 'area_manager',
                    first_name: am.firstName,
                    last_name: am.lastName,
                    password_hash: passwordHash
                },
                create: {
                    email: am.email,
                    role: 'area_manager',
                    first_name: am.firstName,
                    last_name: am.lastName,
                    password_hash: passwordHash
                }
            });
            console.log(`✅ Restored Area Manager: ${user.first_name} (${user.email})`);
        }
        
        console.log('--- RESTORE COMPLETE ---');
    } catch (e) {
        console.error('Error restoring AMs:', e);
    } finally {
        await prisma.$disconnect();
    }
}

restoreFdcAreaManagers();
