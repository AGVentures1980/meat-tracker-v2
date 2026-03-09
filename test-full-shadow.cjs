const https = require('https');

function request(urlStr, method, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function test() {
    const BACKEND = 'https://www.brasameat.com';
    console.log("Logging into production...");
    const login = await request(`${BACKEND}/api/v1/auth/login`, 'POST', {
        email: 'alexandre@alexgarciaventures.co',
        password: 'Ag2113@9' // The user's actual local credential pattern seen earlier
    });

    if (login.status !== 200) {
        console.error("Login Failed:", login.status, login.body);
        return;
    }

    const token = JSON.parse(login.body).token;
    console.log("Logged in. Got token.");

    console.log("Querying Shadow Dashboard...");
    const dash = await request(`${BACKEND}/api/v1/intelligence/procurement-shadow?date=2026-03-09&companyId=tdb-main`, 'GET', null, token);

    console.log("Shadow Dashboard Status:", dash.status);
    console.log("Shadow Dashboard Body:", dash.body);
}

test().catch(console.error);
