const https = require('https');

function check() {
    https.get('https://fdc.brasameat.com', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            // Wait for Railway to switch the proxy to the new container build
            // The CI first builds React, then builds the backend, then swaps the traffic route.
            console.log(`[WAITING] Pinged Railway (Status: ${res.statusCode}). Waiting for deployment to finish...`);
            setTimeout(check, 10000);
        });
    }).on('error', (err) => {
        console.log(`[ERROR] ${err.message}. Retrying...`);
        setTimeout(check, 10000);
    });
}

// We'll just run it 5 times and exit so we don't hang forever
let attempts = 0;
const originalCheck = check;
check = function () {
    attempts++;
    if (attempts > 5) process.exit(0);
    originalCheck();
}

check();
