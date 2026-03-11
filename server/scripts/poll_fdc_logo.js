const https = require('https');

function triggerSetupAndCheck() {
    console.log('[POLL] Triggering setup/tenants...');
    https.get('https://fdc.brasameat.com/api/v1/theme/setup/tenants', (res) => {
        let setupData = '';
        res.on('data', chunk => setupData += chunk);
        res.on('end', () => {
            // Now check the fogo theme
            https.get('https://fdc.brasameat.com/api/v1/theme/fogo', (res2) => {
                let data = '';
                res2.on('data', chunk => data += chunk);
                res2.on('end', () => {
                    try {
                        const theme = JSON.parse(data);
                        if (theme.logo_url === '/fdc-logo.png') {
                            console.log('[SUCCESS] Database has successfully synced to fdc-logo.png!');
                            process.exit(0);
                        } else {
                            console.log(`[WAITING] logo_url is currently ${theme.logo_url}. Retrying in 10s...`);
                            setTimeout(triggerSetupAndCheck, 10000);
                        }
                    } catch (e) {
                        console.log(`[WAITING] Parsing error. Retrying in 10s...`);
                        setTimeout(triggerSetupAndCheck, 10000);
                    }
                });
            }).on('error', () => setTimeout(triggerSetupAndCheck, 10000));
        });
    }).on('error', (e) => {
        console.log(`[ERROR] ${e.message}`);
        setTimeout(triggerSetupAndCheck, 10000)
    });
}

let count = 0;
const oldFn = triggerSetupAndCheck;
triggerSetupAndCheck = function () {
    count++;
    if (count > 20) process.exit(1);
    oldFn();
}

triggerSetupAndCheck();
