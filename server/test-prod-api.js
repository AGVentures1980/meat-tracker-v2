const jwt = require('jsonwebtoken');

async function check() {
    const token = jwt.sign(
        { userId: 'admin-123', email: 'alexandre@alexgarciaventures.co', role: 'admin' },
        process.env.JWT_SECRET || 'brasa-secret-key-change-me',
        { expiresIn: '12h' }
    );
    
    // First let's check auth middleware response
    const fetch = (await import('node-fetch')).default;
    const res = await fetch('https://meat-intelligence.up.railway.app/api/v1/owner/my-companies', {
        headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log("Status:", res.status);
    console.log("Response:", await res.text());
}
check().catch(console.error);
