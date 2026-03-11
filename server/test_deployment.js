const https = require('https');

function check() {
    https.get('https://fdc.brasameat.com/fdc-hero-1.jpg', (res) => {
        if (res.statusCode === 200) {
            console.log('[SUCCESS] New carousel assets are LIVE!');
            process.exit(0);
        } else {
            console.log(`[WAITING] Got status ${res.statusCode}. Retrying in 10s...`);
            setTimeout(check, 10000);
        }
    }).on('error', (err) => {
        console.log(`[ERROR] ${err.message}. Retrying...`);
        setTimeout(check, 10000);
    });
}

check();
