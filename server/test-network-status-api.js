const http = require('https');

async function testApi() {
    const reqData = JSON.stringify({ email: 'dallas@texasdebrazil.com', password: 'password123' });
    const options = {
        hostname: 'meat-intelligence-final.up.railway.app',
        
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': reqData.length }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const resp = JSON.parse(data);
            if (!resp.token) { console.error("Login failed", resp); return; }
            const token = resp.token;
            console.log("Got token.");

            http.get({
                hostname: 'meat-intelligence-final.up.railway.app',
                
                path: '/api/v1/dashboard/smart-prep/network-status',
                headers: { 'Authorization': 'Bearer ' + token }
            }, (res2) => {
                let data2 = '';
                res2.on('data', chunk => data2 += chunk);
                res2.on('end', () => {
                    console.log("Status:", res2.statusCode);
                    console.log("Response:", data2.substring(0, 300));
                });
            });
        });
    });

    req.write(reqData);
    req.end();
}

testApi();
