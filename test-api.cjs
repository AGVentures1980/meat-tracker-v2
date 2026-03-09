const https = require('https');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'brasameat.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
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
  console.log("Logging in...");
  const loginRes = await request('POST', '/api/v1/auth/login', {
    email: 'alexandre@alexgarciaventures.co',
    password: 'Ag2113@9'
  });

  if (loginRes.status !== 200) {
    console.log("Login failed:", loginRes.status, loginRes.body);
    return;
  }
  const token = JSON.parse(loginRes.body).token;

  console.log("Fetching Shadow Dashboard...");
  const targetDate = '2026-03-09';
  const dataRes = await request('GET', `/api/v1/intelligence/procurement-shadow?date=${targetDate}`, null, token);

  console.log("Status:", dataRes.status);
  console.log("Body:", dataRes.body.substring(0, 1000));
}

test().catch(console.error);
