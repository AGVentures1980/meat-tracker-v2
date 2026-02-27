const http = require('http');
const jwt = require('jsonwebtoken');
const token = jwt.sign(
    {
        userId: '643fabeb-441e-45c8-80ba-b64b66699547',
        email: 'dallas@texasdebrazil.com',
        role: 'director',
        storeId: 30,
        companyId: 'tdb-main',
        isPrimary: true,
        eula_accepted: true,
        position: null
    },
    'brasa-secret-key-change-me',
    { expiresIn: '12h' }
);
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/dashboard/performance-audit',
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
};
const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log('BODY:', data.substring(0, 1500)));
});
req.on('error', error => console.error('Error:', error));
req.end();
