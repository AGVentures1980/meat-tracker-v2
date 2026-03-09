const https = require('https');

async function test() {
    const url = 'https://www.brasameat.com/api/v1/debug/env?key=fatality';
    console.log(`Querying ${url}...`);

    https.get(url, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
            console.log('Status HTTP:', res.statusCode);
            console.log('Body:', data);
        });
    }).on('error', console.error);
}

test();
