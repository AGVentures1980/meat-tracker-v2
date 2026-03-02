const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign({ id: 2, role: 'director', companyId: 'tdb-main', store_id: 31 }, process.env.JWT_SECRET || 'fallback-secret');

async function test() {
    console.log("Testing Network Report Card...");
    try {
        const res = await fetch('http://localhost:3000/api/v1/dashboard/stats/report-card?year=2026&week=9', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        console.log("Report Card status:", res.status);
        console.log("Response:", data);
    } catch (e) {
        console.log(e.message);
    }
}
test();
