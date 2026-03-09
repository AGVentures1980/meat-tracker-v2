const https = require('https');

async function test() {
    const payload = JSON.stringify({
        email: 'alexandre@alexgarciaventures.co',
        password: 'Password123!' // Using a bad password just to see if it reaches logic or crashes on DB
    });

    const req = https.request('https://www.brasameat.com/api/v1/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length
        }
    }, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
            console.log('Status:', res.statusCode);
            console.log('Headers:', res.headers);
            console.log('Body:', data);
        });
    });

    req.on('error', console.error);
    req.write(payload);
    req.end();
}

test();
