const https = require('https');

function triggerSetup() {
    https.get('https://meat-intelligence-final.up.railway.app/api/v1/theme/setup/tenants', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`Setup response: ${data}`);
            verifyTheme();
        });
    });
}

function verifyTheme() {
    https.get('https://meat-intelligence-final.up.railway.app/api/v1/theme/fogo', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const theme = JSON.parse(data);
            if (theme.logo_url === '/fdc-logo.svg') {
                console.log('[SUCCESS] Theme updated to local SVG and clean background.');
                process.exit(0);
            } else {
                console.log(`[WAITING] Theme still old: ${theme.logo_url}. Retrying in 10s...`);
                setTimeout(triggerSetup, 10000);
            }
        });
    }).on('error', (err) => {
        console.error(`Error: ${err.message}. Retrying...`);
        setTimeout(triggerSetup, 10000);
    });
}

triggerSetup();
