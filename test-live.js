const https = require('https');
async function test() {
  const req = https.get('https://brasameat.com/api/v1/health', (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data));
  });
  req.on('error', console.error);
}
test();
