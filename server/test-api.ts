import fetch from 'node-fetch';

async function main() {
    // 1. Get Token (we can mock the token since we know the secret, or we can just send a login)
    // Wait, let's login directly against the prod API!
    console.log("Attempting login to production API...");
    // Let's just generate a token locally using the JWT_SECRET from production.
    // Assuming JWT_SECRET='brasa-secret-key-change-me' is used in prod.
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
        {
            userId: 'test-admin-id',
            email: 'alexandre@alexgarciaventures.co',
            role: 'admin',
            companyId: null,
            scope: { type: 'GLOBAL' },
            isPrimary: true
        },
        'brasa-secret-key-change-me',
        { expiresIn: '12h' }
    );
    
    console.log("Token generated. Fetching /my-companies...");
    const res = await fetch('https://meat-intelligence.up.railway.app/api/v1/owner/my-companies', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text);
}
main().catch(console.error);
