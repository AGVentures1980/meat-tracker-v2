import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'addison@texasdebrazil.com' }
    });

    if (!user) {
        console.error('User addison@texasdebrazil.com not found!');
        process.exit(1);
    }

    console.log(`Found Addison user: ${user.id}`);

    const moduleIds = ['1', '2', '3', '4', '5', '6', '7'];
    
    for (const moduleId of moduleIds) {
        await prisma.trainingProgress.upsert({
            where: {
                user_id_module_id: {
                    user_id: user.id,
                    module_id: moduleId
                }
            },
            update: {
                score: 100,
                completed_at: new Date()
            },
            create: {
                user_id: user.id,
                module_id: moduleId,
                score: 100,
                completed_at: new Date()
            }
        });
        console.log(`Unlocked module ${moduleId}`);
    }

    console.log('All modules unlocked successfully for Addison.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
