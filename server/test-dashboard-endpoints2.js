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
            console.log(`\nFetching URL: ${url}`);
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log(`Status: ${res.status}`);
            const data = await res.text();
            console.log(`Response length: ${data.length}`);
            if (res.status !== 200) {
                 console.log(data);
            }
        } catch (e) {
            console.error(e);
        }
    }
}
run();
