const https = require('https');

function pollEndpoint() {
    console.log(`[${new Date().toISOString()}] Polling FDC seed endpoint...`);
    https.get('https://meat-intelligence-final.up.railway.app/api/v1/public-debug/seed-fdc?key=fatality', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log(`[SUCCESS] Seeding complete! Status: ${res.statusCode}`);
                console.log(`Response: ${data}`);
                process.exit(0);
            } else {
                console.log(`[WAITING] Status: ${res.statusCode}. Retrying in 10s...`);
                // Wait and retry
                setTimeout(pollEndpoint, 10000);
            }
        });
    }).on('error', (err) => {
        console.error(`[ERROR] Request failed: ${err.message}. Retrying in 10s...`);
        setTimeout(pollEndpoint, 10000);
    });
}

pollEndpoint();
