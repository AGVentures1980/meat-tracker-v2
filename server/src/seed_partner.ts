import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Global Partner Reseller ecosystem...');

    // 1. Ensure John Doe Partner User
    const hashedPartnerPassword = await bcrypt.hash('partner123', 10);
    const partnerUser = await prisma.user.upsert({
        where: { email: 'partner@example.com' },
        update: {
            first_name: 'John',
            last_name: 'Doe (Partner)',
            role: 'partner'
        },
        create: {
            email: 'partner@example.com',
            password_hash: hashedPartnerPassword,
            first_name: 'John',
            last_name: 'Doe (Partner)',
            role: 'partner'
        }
    });

    console.log(`Ensured Partner User: ${partnerUser.email}`);

    // 2. Create the Partner Profile
    const partner = await prisma.partner.upsert({
        where: { user_id: partnerUser.id },
        update: {
            country: 'USA',
            tax_id: '99-9999999',
            paypal_email: 'johndoe.payouts@example.com',
            status: 'Active'
        },
        create: {
            user_id: partnerUser.id,
            legal_entity_type: 'Individual',
            country: 'USA',
            tax_id: '99-9999999',
            paypal_email: 'johndoe.payouts@example.com',
            status: 'Active'
        }
    });

    console.log(`Ensured Partner Profile for User ID: ${partnerUser.id}. Partner ID: ${partner.id}`);

    // 3. Create Sample Proposals (Standard & Escalated)
    
    // Standard Proposal
    await prisma.proposal.create({
        data: {
            partner_id: partner.id,
            client_name: 'Miami Beach Steakhouses LLC',
            contact_email: 'ceo@miamisteak.com',
            contact_phone: '+1 305 555 1234',
            country: 'USA',
            language: 'English',
            store_count: 2,
            setup_fee: 2500,
            monthly_fee: 600,
            status: 'Draft'
        }
    });
    
    // Escalated Enterprise Proposal (Anti-fraud trigger)
    await prisma.proposal.create({
        data: {
            partner_id: partner.id,
            client_name: 'Global Meat Conglomerate',
            contact_email: 'vp.ops@globalmeat.biz',
            contact_phone: '+1 800 555 8888',
            country: 'UK',
            language: 'English',
            store_count: 45,
            setup_fee: 15000,
            monthly_fee: 13500,
            status: 'AGV_Review',
            agv_review_notes: 'ENTERPRISE DEAL: Placed under AGV Master Negotiation Lock due to high store count.'
        }
    });

    console.log('Successfully seeded 2 mock proposals.');

    // 4. Create Mock Payouts for Dashboard Gamification
    await prisma.payout.createMany({
        data: [
            {
                partner_id: partner.id,
                amount: 1750,
                currency: 'USD',
                type: 'HuntingFee',
                status: 'Paid',
                paypal_transaction_id: 'PAYPAL-TX-998877'
            },
            {
                partner_id: partner.id,
                amount: 450,
                currency: 'USD',
                type: 'FarmingMRR',
                status: 'Pending',
                paypal_transaction_id: null
            }
        ]
    });

    console.log('Successfully seeded mock Payout entries.');
    console.log('--- SEEDING COMPLETE ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
