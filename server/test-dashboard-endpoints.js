const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const token = jwt.sign({
    userId: 1, // Alexandre
    email: 'dallas@texasdebrazil.com',
    role: 'manager', // Testing as a regular manager to ensure no 403s on stats
    storeId: 1,
    companyId: 'txdb-001'
}, process.env.JWT_SECRET || 'brasa-secret-key-change-me', { expiresIn: '1h' });

async function run() {
    const urls = [
        'http://localhost:5001/api/v1/dashboard/stats/report-card?year=2026&week=9',
        'http://localhost:5001/api/v1/dashboard/company-stats',
        'http://localhost:5001/api/v1/intelligence/anomalies'
    ];

    for (const url of urls) {
        try {
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log(`\nURL: ${url}`);
            console.log(`Status: ${res.status}`);
            if (res.status !== 200) {
                console.log(await res.text());
            } else {
                 console.log(`Success! Data length: ${JSON.stringify(await res.json()).length}`);
            }
        } catch (e) {
            console.error(e);
        }
    }
}
run();
