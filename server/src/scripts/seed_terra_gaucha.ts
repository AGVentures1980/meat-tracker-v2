import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🟩 ------------------------------------------ 🟩');
    console.log('🥩 INITIATING TERRA GAUCHA DEMO SEEDER');
    console.log('🟩 ------------------------------------------ 🟩\n');

    // 1. Ensure Terra Gaucha Company exists with RODIZIO mode
    let terra = await prisma.company.findFirst({
        where: { subdomain: 'terra' }
    });

    if (!terra) {
        terra = await prisma.company.create({
            data: {
                name: 'Terra Gaucha',
                operationType: 'RODIZIO',
                plan: 'enterprise',
                subdomain: 'terra',
                theme_primary_color: '#008751', 
                theme_logo_url: 'https://terragaucha.com/wp-content/uploads/2024/08/logo-terra-final-11.svg', 
                theme_bg_url: 'https://terragaucha.com/wp-content/uploads/2024/09/Deck-Terra-Site.mp4' 
            }
        });
        console.log(`[+] Created Terra Gaucha Company (ID: ${terra.id})`);
    } else {
        terra = await prisma.company.update({
            where: { id: terra.id },
            data: { 
                operationType: 'RODIZIO', 
                name: 'Terra Gaucha',
                theme_primary_color: '#008751',
                theme_logo_url: 'https://terragaucha.com/wp-content/uploads/2024/08/logo-terra-final-11.svg',
                theme_bg_url: 'https://terragaucha.com/wp-content/uploads/2024/09/Deck-Terra-Site.mp4'
            }
        });
        console.log(`[~] Updated Terra Gaucha Company settings (ID: ${terra.id})`);
    }

    const cid = terra.id;

    // 2. Establish Rodizio Proteins (Same as TDB format)
    const proteins = [
        { name: 'Picanha', group: 'Sirloin', is_villain: true, target: 0.39 },
        { name: 'Filet Mignon', group: 'Filet', is_villain: true, target: 0.10 },
        { name: 'Fraldinha', group: 'Flank', is_villain: true, target: 0.24 },
        { name: 'Rack of Lamb', group: 'Lamb', is_villain: false, target: 0.08 },
        { name: 'Beef Ribs', group: 'Ribeye', is_villain: false, target: 0.08 }
    ];

    for (const p of proteins) {
        await prisma.companyProduct.upsert({
            where: { company_id_name: { company_id: cid, name: p.name } },
            update: { protein_group: p.group, is_villain: p.is_villain, standard_target: p.target },
            create: { company_id: cid, name: p.name, protein_group: p.group, is_villain: p.is_villain, standard_target: p.target }
        });
    }
    console.log(`[+] Seeded ${proteins.length} Core Proteins for Terra Gaucha`);

    // 3. Setup Terra Gaucha Stores
    const stores = [
        { name: 'Jacksonville', loc: '4483 Southside Blvd, Jacksonville, FL 32216' },
        { name: 'Tampa', loc: '1108 South Dale Mabry Hwy, Tampa, FL 33629' },
        { name: 'Stamford', loc: 'Stamford Town Center 230 Tresser Blvd, CT 06901' },
        { name: 'Indianapolis', loc: '8487 Union Chapel Rd, Indianapolis, IN 46240' },
        { name: 'Omaha', loc: '13851 FNB Pkwy, Omaha, NE 68154' },
        { name: 'Rockville', loc: '1651 Chapman Avenue, Rockville, MD 20852' }
    ];

    const createdStores = [];
    for (const s of stores) {
        let store = await prisma.store.findFirst({
            where: { store_name: s.name, company_id: cid }
        });
        if (!store) {
            store = await prisma.store.create({
                data: {
                    company_id: cid,
                    store_name: s.name,
                    location: s.loc,
                    is_pilot: true,
                    pilot_start_date: new Date()
                }
            });
        }
        createdStores.push(store);
    }
    console.log(`[+] Seeded ${createdStores.length} Stores. Primary Pilot: ${createdStores[0].store_name}`);

    // 4. Create the Demo Hierarchy 
    const password = await bcrypt.hash('Terra2026@', 10);
    
    // The Director (sees ALL stores)
    await prisma.user.upsert({
        where: { email: 'paulo@terragaucha.com' },
        update: { role: 'director', is_primary: true, password_hash: password },
        create: {
            email: 'paulo@terragaucha.com',
            first_name: 'Paulo', last_name: 'Simonetti',
            password_hash: password,
            role: 'director',
            director_region: 'National',
            is_primary: true
        }
    });

    console.log(`[+] Seeded Corporate Exec Account (Email: paulo@terragaucha.com | Password: Terra2026@)`);

    // 5. Ghost Math Injection (Sentinel Bait for Paulo to see)
    // Clear current open tickets for the first store so the new one pops up cleanly
    const pilotStore = createdStores[0];
    await prisma.supportTicket.deleteMany({
        where: { store_id: pilotStore.id, title: { contains: '[SENTINEL' } }
    });

    const ticket = await prisma.supportTicket.create({
        data: {
            store_id: pilotStore.id,
            user_id: (await prisma.user.findFirst({ where: { role: 'director' } }))?.id || '',
            title: `[SENTINEL ALERT] Consumo Atípico: Filet Mignon Yield Crash & 2.2 Lbs/Pax (${pilotStore.store_name})`,
            status: 'OPEN',
            is_escalated: true,
        }
    });

    await prisma.supportMessage.create({
        data: {
            ticket_id: ticket.id,
            sender_type: 'AI',
            content: `ALERTA DE SISTEMA (Brasa Intelligence):\n\nA auditoria matemática cruzada detectou uma anomalia grave na loja ${pilotStore.store_name}.\n\nVariante de Escape Detectada: Over-Yielding (Falha Grosseira de Aproveitamento).\nProduto: Filet Mignon\n\nA última caixa primária de 60 lbs bipada pela inteligência GS1-128 tem um padrão ouro de aproveitamento de 80% na limpeza. Porém, nossos algoritmos indicam que apenas 35 lbs efetivas dessa caixa chegaram ao salão. Paralelamente, o consumo global puxou para um Lbs/Pax gritante de 2.2 lbs.\n\nGap Identificado = ~13 lbs evaporadas no lixo ou má queima.\nRisco Financeiro: USD $180.00/caixa (Prejuízo de Margem).\n\nAção: Audite as lixeiras de descarte do açougueiro e verifique ponto de queima da equipe de Passadores (Gauchos).`
        }
    });

    console.log(`[+] 🛑 Injected Sentinel Escalation in ${pilotStore.store_name} for Paulo's Dashboard`);

    console.log('\n✅ ------------------------------------------ ✅');
    console.log('DEMO SEEDER SUCESSFULLY EXECUTED. ENV READY!');
    console.log('✅ ------------------------------------------ ✅');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
