const https = require('https');

function request(urlStr, method, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  const BACKEND_URL = 'https://brasameat.com';
  console.log("Logging into production...");
  const loginRes = await request(`${BACKEND_URL}/api/v1/auth/login`, 'POST', {
    email: 'alexandre@alexgarciaventures.co',
    password: 'Ag2113@9' // or whatever the master admin uses
  });
  console.log("Login HTTP Status:", loginRes.status);
  if (loginRes.status === 200) {
    const data = JSON.parse(loginRes.body);
    const token = data.token;
    console.log("Got token! Querying shadow dashboard...");
    const dashRes = await request(`${BACKEND_URL}/api/v1/intelligence/procurement-shadow?date=2026-03-09&companyId=tdb-main`, 'GET', null, token);
    console.log("Dashboard HTTP Status:", dashRes.status);
    console.log("Dashboard Body:", dashRes.body);
  } else {
    console.log("Login Failed:", loginRes.body);
  }
}

test().catch(console.error);
