const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'brasa-secret-key-change-me';

// Mock user payload matching the platform
const payload = {
    id: 'test-admin-123',
    email: 'alexandre@alexgarciaventures.co',
    role: 'director',
    first_name: 'Alex',
    last_name: 'Garcia'
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

async function testSupportAPI() {
    try {
        console.log('--- TEST 1: GET /api/v1/support/faq ---');
        const resFaq = await fetch('http://localhost:3000/api/v1/support/faq', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`FAQ Status: ${resFaq.status} ${resFaq.statusText}`);
        console.log('Body:', await resFaq.text());

        console.log('\n--- TEST 2: GET /api/v1/support/chat ---');
        const resChat = await fetch('http://localhost:3000/api/v1/support/chat', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`Chat Status: ${resChat.status} ${resChat.statusText}`);
        console.log('Body:', await resChat.text());

        console.log('\n--- TEST 3: POST /api/v1/support/chat ---');
        const resPost = await fetch('http://localhost:3000/api/v1/support/chat', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: 'Hi I have a bug on my dashboard' })
        });
        console.log(`POST Chat Status: ${resPost.status} ${resPost.statusText}`);
        console.log('Body:', await resPost.text());

    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

testSupportAPI();
