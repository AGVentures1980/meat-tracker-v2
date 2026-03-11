const https = require('https');

function check() {
    https.get('https://fdc.brasameat.com/background_fdc.jpg', (res) => {
        let size = 0;
        res.on('data', chunk => size += chunk.length);
        res.on('end', () => {
            if (res.statusCode === 200 && size > 10000) {
                console.log(`[SUCCESS] Images are fixed! Size: ${size} bytes`);
                process.exit(0);
            } else {
                console.log(`[WAITING] Got status ${res.statusCode}, size ${size}. Retrying in 10s...`);
                setTimeout(check, 10000);
            }
        });
    }).on('error', (err) => {
        console.log(`[ERROR] ${err.message}. Retrying...`);
        setTimeout(check, 10000);
    });
}

check();
