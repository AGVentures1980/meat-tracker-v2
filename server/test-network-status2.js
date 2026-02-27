const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const token = JSON.parse(data).token;
    console.log("Got token");
    
    // Now request status
    const req2 = http.request({
        hostname: 'localhost',
        port: 5001,
        path: '/api/v1/dashboard/smart-prep/network-status',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    }, (res2) => {
        let data2 = '';
        res2.on('data', (chunk) => data2 += chunk);
        res2.on('end', () => {
            console.log("Status response:", res2.statusCode);
            console.log(data2);
            process.exit(0);
        });
    });
    req2.end();
  });
});

req.write(JSON.stringify({ email: 'dallas@texasdebrazil.com', password: 'password123' }));
req.end();
