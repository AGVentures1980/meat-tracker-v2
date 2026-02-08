
const fetch = require('node-fetch');

async function test() {
    const baseUrl = 'http://localhost:3001/api/v1';

    console.log('1. Attempting Login...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'dallas@texasdebrazil.com',
            password: 'Dallas2026'
        })
    });

    const data = await loginRes.json();

    if (!loginRes.ok) {
        console.error('❌ Login Failed:', data);
        return;
    }

    console.log('✅ Login Success!');
    console.log('User Role:', data.user.role);
    console.log('Token:', data.token.substring(0, 20) + '...');

    if (data.user.role !== 'director') {
        console.error('❌ Role mismatch! Expected director.');
    }

    // 2. Test Dashboard Access
    console.log('\n2. Testing Network Stats Access...');
    const netRes = await fetch(`${baseUrl}/dashboard/bi-network`, {
        headers: { 'Authorization': `Bearer ${data.token}` }
    });

    if (netRes.ok) {
        const netData = await netRes.json();
        console.log(`✅ Network Stats Access OK! Rows: ${Array.isArray(netData) ? netData.length : '?'}`);
    } else {
        console.error('❌ Network Stats Access FAILED:', netRes.status, await netRes.text());
    }

    // 3. Test Executive Stats Access
    console.log('\n3. Testing Executive Stats Access...');
    const execRes = await fetch(`${baseUrl}/dashboard/company-stats`, {
        headers: { 'Authorization': `Bearer ${data.token}` }
    });

    if (execRes.ok) {
        const execData = await execRes.json();
        console.log('✅ Executive Stats Access OK!');
        console.log('Summary:', execData.summary);
    } else {
        console.error('❌ Executive Stats Access FAILED:', execRes.status, await execRes.text());
    }
}

test();
