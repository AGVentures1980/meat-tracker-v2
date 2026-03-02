const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign({ id: 2, role: 'director', companyId: 'tdb-main', store_id: 31 }, process.env.JWT_SECRET || 'fallback-secret');

async function test() {
    console.log("Testing Performance Audit...");
    try {
        const res = await fetch('http://localhost:3000/api/v1/dashboard/performance-audit', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        console.log("Performance Audit status:", res.status);
    } catch (e) {
        console.log(e.message);
    }

    console.log("\nTesting Analyst ROI...");
    try {
        const res2 = await fetch('http://localhost:3000/api/v1/analyst/roi', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data2 = await res2.json();
        console.log("Analyst ROI status:", res2.status);
        if (!data2.success) console.log("Error:", data2);
        else {
            const lexington = data2.stores.find(s => s.storeName.includes('Lex'));
            console.log("Lexington Data:", lexington ? "Found" : "Not Found");
        }
    } catch (e) {
        console.log(e.message);
    }
}
test();
