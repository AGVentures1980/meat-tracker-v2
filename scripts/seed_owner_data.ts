import { PrismaClient } from '@prisma/client';
import { setupOwnerCompanies } from '../server/src/controllers/OwnerController';

async function seed() {
    const req = {} as any;
    const res = {
        json: (data: any) => console.log('SUCCESS:', data),
        status: (code: number) => ({
            json: (data: any) => console.error(`ERROR (${code}):`, data)
        })
    } as any;

    console.log('--- Starting Owner & Mockup Seeding ---');
    await OwnerController.setupOwnerCompanies(req, res);
    console.log('--- Seeding Process Finished ---');
    process.exit(0);
}

seed().catch(err => {
    console.error('Fatal Error during seeding:', err);
    process.exit(1);
});
