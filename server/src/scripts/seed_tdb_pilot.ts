import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🔥 ------------------------------------------ 🔥');
    console.log('🥩 INITIATING TEXAS DE BRAZIL ZOOM DEMO SEEDER');
    console.log('🔥 ------------------------------------------ 🔥\n');

    // 1. Ensure Texas de Brazil Company exists with RODIZIO mode
    let tdb = await prisma.company.findFirst({
        where: { name: { contains: 'Texas de Brazil', mode: 'insensitive' } }
    });

    if (!tdb) {
        tdb = await prisma.company.create({
            data: {
                name: 'Texas de Brazil',
                operationType: 'RODIZIO',
                plan: 'enterprise',
                subdomain: 'texas',
                theme_primary_color: '#8b0000', // Dark corporate red
                theme_logo_url: '/tdb-logo.svg', // Assuming placeholder or existent
                theme_bg_url: '/tdb-hero.mp4' // Atmospheric rodizio fire
            }
        });
        console.log(`[+] Created Texas de Brazil Company (ID: ${tdb.id})`);
    } else {
        tdb = await prisma.company.update({
            where: { id: tdb.id },
            data: { operationType: 'RODIZIO', subdomain: 'texas' }
        });
        console.log(`[~] Updated TDB Company settings (ID: ${tdb.id})`);
    }

    const cid = tdb.id;

    // 2. Establish Rodizio Proteins
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
    console.log(`[+] Seeded ${proteins.length} Core Proteins for TDB`);

    // 3. Setup Addison Store (and Tampa to show multiple stores)
    const stores = [
        { name: 'Addison (Pilot)', loc: 'Addison, TX' },
        { name: 'Tampa', loc: 'Tampa, FL' },
        { name: 'Miami Beach', loc: 'Miami, FL' }
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
    const addison = createdStores[0];
    const tampa = createdStores[1];
    console.log(`[+] Seeded 3 Stores. Primary Pilot: ADDISON (ID: ${addison.id})`);

    // 4. Create the Zoom Demo Hierarchy (Rodrigo, Carlos, Store GM)
    const password = await bcrypt.hash('SenhaDemo2026!', 10);
    
    // The Director (sees ALL 60 stores)
    await prisma.user.upsert({
        where: { email: 'rodrigo.davila@texasdebrazil.com' },
        update: { role: 'director', is_primary: true },
        create: {
            email: 'rodrigo.davila@texasdebrazil.com',
            first_name: 'Rodrigo', last_name: 'Davila',
            password_hash: password,
            role: 'director',
            director_region: 'National',
            is_primary: true
        }
    });

    // The AM (sees his specific stores in TX)
    await prisma.user.upsert({
        where: { email: 'carlos.am@texasdebrazil.com' },
        update: { role: 'area_manager', is_primary: true },
        create: {
            email: 'carlos.am@texasdebrazil.com',
            first_name: 'Carlos', last_name: 'AM',
            password_hash: password,
            role: 'area_manager',
            is_primary: true
        }
    });

    // We link Addison to Carlos (assuming we have an elegant way, but let's just use raw role for now)

    // The Store GM (sees only Addison)
    const addisonPassword = await bcrypt.hash('TDB-Addison-20', 10);
    await prisma.user.upsert({
        where: { email: 'addison@texasdebrazil.com' },
        update: { store_id: addison.id, role: 'manager', is_primary: true, password_hash: addisonPassword },
        create: {
            email: 'addison@texasdebrazil.com',
            first_name: 'Addison', last_name: 'Manager',
            password_hash: addisonPassword,
            role: 'manager',
            store_id: addison.id,
            is_primary: true
        }
    });
    console.log(`[+] Seeded Accounts (Passwords: SenhaDemo2026! | Addison: TDB-Addison-20)`);

    // 5. Ghost Math Injection (The Sentinel Bait for Rodrigo to see)
    // We clear current open tickets for Addison so the new one pops up cleanly
    await prisma.supportTicket.deleteMany({
        where: { store_id: addison.id, title: { contains: '[SENTINEL' } }
    });

    const ticket = await prisma.supportTicket.create({
        data: {
            store_id: addison.id,
            user_id: (await prisma.user.findFirst({ where: { role: 'director' } }))?.id || '',
            title: '[SENTINEL ALERT] Consumo Atípico: Filet Mignon Yield Crash & 2.2 Lbs/Pax (Addison)',
            status: 'OPEN',
            is_escalated: true,
        }
    });

    await prisma.supportMessage.create({
        data: {
            ticket_id: ticket.id,
            sender_type: 'AI',
            content: `ALERTA DE SISTEMA (Brasa Intelligence):\n\nA auditoria matemática cruzada detectou uma anomalia grave na loja Addison, TX.\n\nVariante de Escape Detectada: Over-Yielding (Falha Grosseira de Aproveitamento).\nProduto: Filet Mignon\n\nA última caixa primária de 60 lbs bipada pela inteligência GS1-128 tem um padrão ouro de aproveitamento de 80% na limpeza. Porém, nossos algoritmos indicam que apenas 35 lbs efetivas dessa caixa chegaram ao salão. Paralelamente, o consumo global puxou para um Lbs/Pax gritante de 2.2 lbs.\n\nGap Identificado = ~13 lbs evaporadas no lixo ou má queima.\nRisco Financeiro: USD $180.00/caixa (Prejuízo de Margem).\n\nAção: Audite as lixeiras de descarte do açougueiro e verifique ponto de queima da equipe de Passadores (Gauchos).`
        }
    });

    console.log(`[+] 🛑 Injected Sentinel Escalation in Addison for Rodrigo's Dashboard`);

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
