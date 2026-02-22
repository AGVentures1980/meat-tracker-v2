const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'brasa-secret-key-change-me';

async function testStoreManagerChat() {
    try {
        const testManager = await prisma.user.findFirst({
            where: { role: 'manager' }
        });

        if (!testManager) {
            console.error('No manager found');
            return;
        }

        const payload = {
            userId: testManager.id,
            email: testManager.email,
            role: testManager.role,
            storeId: testManager.store_id, // camelCase as in AuthController
            companyId: 'tdb-main'
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

        console.log('\n--- SIMULATING STORE MANAGER POST /api/v1/support/chat ---');
        const resPost = await fetch('http://localhost:3000/api/v1/support/chat', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            // The frontend sets store_id to selectedCompany which is 'tdb-main'
            body: JSON.stringify({ content: 'Hi I have a bug on my dashboard', store_id: 'tdb-main' })
        });

        console.log(`Status: ${resPost.status} ${resPost.statusText}`);
        const text = await resPost.text();
        console.log('Body:', text);

    } catch (err) {
        console.error('Test Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

testStoreManagerChat();
