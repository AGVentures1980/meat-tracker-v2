const https = require('https');
async function request(urlStr, method, body = null, token = null) {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ s: res.statusCode, b: data }));
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
async function test() {
  const host = 'https://www.brasameat.com';
  console.log("Login...");
  const log = await request(host + '/api/v1/auth/login', 'POST', {
    email: 'alexandre@alexgarciaventures.co', password: 'Password123!'
  });
  console.log("Login", log.s, log.b);
}
test();
