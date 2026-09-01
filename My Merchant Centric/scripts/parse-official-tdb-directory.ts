import https from 'https';

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}

async function parseOfficialDirectory() {
  console.log('==================================================');
  console.log('FETCHING LIVE OFFICIAL TEXAS DE BRAZIL DIRECTORY');
  console.log('https://texasdebrazil.com/locations/');
  console.log('==================================================\n');

  try {
    const html = await fetchUrl('https://texasdebrazil.com/locations/');
    console.log(`Fetched HTML length: ${html.length} bytes`);

    // Extract links or location references from HTML
    const locationUrls: string[] = [];
    const regex = /href="(https:\/\/texasdebrazil\.com\/locations\/[a-z0-9\-]+\/)"/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (!locationUrls.includes(match[1]) && !match[1].endsWith('/locations/')) {
        locationUrls.push(match[1]);
      }
    }

    console.log(`Found ${locationUrls.length} distinct location URLs in official directory:\n`);
    locationUrls.forEach(url => console.log(`  • ${url}`));

    return { html, locationUrls };
  } catch (err) {
    console.error('Failed to fetch official directory:', err);
    throw err;
  }
}

parseOfficialDirectory().catch(console.error);
