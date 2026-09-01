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

export interface OfficialLocationDetail {
  slug: string;
  officialUrl: string;
  canonicalName: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  status: 'OPERATIONAL' | 'COMING_SOON' | 'INTERNATIONAL';
  isUsNetwork: boolean;
  isUsTerritory: boolean;
}

const OFFICIAL_URLS = [
  "https://texasdebrazil.com/locations/fairfax/",
  "https://texasdebrazil.com/locations/richmond/",
  "https://texasdebrazil.com/locations/pittsburgh/",
  "https://texasdebrazil.com/locations/yonkers/",
  "https://texasdebrazil.com/locations/long-island/",
  "https://texasdebrazil.com/locations/woodmere/",
  "https://texasdebrazil.com/locations/buffalo/",
  "https://texasdebrazil.com/locations/syracuse/",
  "https://texasdebrazil.com/locations/rochester/",
  "https://texasdebrazil.com/locations/hartford/",
  "https://texasdebrazil.com/locations/albany/",
  "https://texasdebrazil.com/locations/westlake/",
  "https://texasdebrazil.com/locations/columbus/",
  "https://texasdebrazil.com/locations/cincinnati/",
  "https://texasdebrazil.com/locations/detroit/",
  "https://texasdebrazil.com/locations/greenville/",
  "https://texasdebrazil.com/locations/lexington/",
  "https://texasdebrazil.com/locations/ann-arbor/",
  "https://texasdebrazil.com/locations/westminster/",
  "https://texasdebrazil.com/locations/colorado-springs/",
  "https://texasdebrazil.com/locations/louisville/",
  "https://texasdebrazil.com/locations/grand-rapids/",
  "https://texasdebrazil.com/locations/orland-park/",
  "https://texasdebrazil.com/locations/huntsville/",
  "https://texasdebrazil.com/locations/schaumburg/",
  "https://texasdebrazil.com/locations/jacksonville/",
  "https://texasdebrazil.com/locations/milwaukee/",
  "https://texasdebrazil.com/locations/birmingham/",
  "https://texasdebrazil.com/locations/orlando/",
  "https://texasdebrazil.com/locations/memphis/",
  "https://texasdebrazil.com/locations/tampa/",
  "https://texasdebrazil.com/locations/palm-beach-gardens/",
  "https://texasdebrazil.com/locations/sunrise/",
  "https://texasdebrazil.com/locations/hallandale-beach/",
  "https://texasdebrazil.com/locations/miami-beach/",
  "https://texasdebrazil.com/locations/dolphin-mall/",
  "https://texasdebrazil.com/locations/dadeland-mall/",
  "https://texasdebrazil.com/locations/rogers/",
  "https://texasdebrazil.com/locations/baton-rouge/",
  "https://texasdebrazil.com/locations/omaha/",
  "https://texasdebrazil.com/locations/tulsa/",
  "https://texasdebrazil.com/locations/tyler/",
  "https://texasdebrazil.com/locations/oklahoma-city/",
  "https://texasdebrazil.com/locations/addison/",
  "https://texasdebrazil.com/locations/dallas/",
  "https://texasdebrazil.com/locations/fort-worth/",
  "https://texasdebrazil.com/locations/houston/",
  "https://texasdebrazil.com/locations/san-antonio/",
  "https://texasdebrazil.com/locations/denver/",
  "https://texasdebrazil.com/locations/mcallen/",
  "https://texasdebrazil.com/locations/san-juan/",
  "https://texasdebrazil.com/locations/palm-beach/",
  "https://texasdebrazil.com/locations/panama-city/",
  "https://texasdebrazil.com/locations/las-vegas/",
  "https://texasdebrazil.com/locations/port-of-spain/",
  "https://texasdebrazil.com/locations/rancho-cucamonga/",
  "https://texasdebrazil.com/locations/carlsbad/",
  "https://texasdebrazil.com/locations/irvine/",
  "https://texasdebrazil.com/locations/fresno/",
  "https://texasdebrazil.com/locations/tacoma/",
  "https://texasdebrazil.com/locations/georgetown/",
  "https://texasdebrazil.com/locations/honolulu/",
  "https://texasdebrazil.com/locations/seoul-apgujeong/",
  "https://texasdebrazil.com/locations/seoul-central-city/"
];

async function parseAllLocationPages() {
  console.log('==================================================');
  console.log('PARSING ALL INDIVIDUAL OFFICIAL LOCATION PAGES');
  console.log('==================================================\n');

  const results: OfficialLocationDetail[] = [];

  for (const url of OFFICIAL_URLS) {
    const slug = url.split('/locations/')[1].replace('/', '');
    try {
      const html = await fetchUrl(url);

      // Check if Coming Soon or Future
      const isComingSoon = html.toLowerCase().includes('coming soon') || html.toLowerCase().includes('opening 202');

      // Check if International
      const isInternational = slug === 'panama-city' || slug === 'port-of-spain' || slug.startsWith('seoul');
      const isPuertoRico = slug === 'san-juan';

      // Title/Name extraction
      const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
      let rawTitle = titleMatch ? titleMatch[1].replace(' - Texas de Brazil', '').replace('Texas de Brazil - ', '').trim() : slug;
      rawTitle = rawTitle.replace('&amp;', '&');

      // Basic address regex extractions from Schema.org or page content
      let street = '';
      let city = '';
      let state = '';
      let postal = '';

      const streetMatch = html.match(/"streetAddress":\s*"([^"]+)"/i) || html.match(/class="[^"]*street-address[^"]*">([^<]+)</i);
      if (streetMatch) street = streetMatch[1].trim();

      const cityMatch = html.match(/"addressLocality":\s*"([^"]+)"/i) || html.match(/class="[^"]*locality[^"]*">([^<]+)</i);
      if (cityMatch) city = cityMatch[1].trim();

      const stateMatch = html.match(/"addressRegion":\s*"([^"]+)"/i) || html.match(/class="[^"]*region[^"]*">([^<]+)</i);
      if (stateMatch) state = stateMatch[1].trim();

      const postalMatch = html.match(/"postalCode":\s*"([^"]+)"/i) || html.match(/class="[^"]*postal-code[^"]*">([^<]+)</i);
      if (postalMatch) postal = postalMatch[1].trim();

      const phoneMatch = html.match(/"telephone":\s*"([^"]+)"/i) || html.match(/tel:([0-9\-\(\)\s\+]+)/i);
      const phone = phoneMatch ? phoneMatch[1].trim() : '';

      results.push({
        slug,
        officialUrl: url,
        canonicalName: `Texas de Brazil - ${rawTitle}`,
        streetAddress: street,
        city: city || rawTitle,
        state: state,
        postalCode: postal,
        country: isPuertoRico ? 'Puerto Rico' : isInternational ? 'International' : 'USA',
        phone,
        status: isInternational ? 'INTERNATIONAL' : isComingSoon ? 'COMING_SOON' : 'OPERATIONAL',
        isUsNetwork: !isInternational && !isPuertoRico,
        isUsTerritory: isPuertoRico
      });

      console.log(`[PARSED] ${slug} -> ${rawTitle} | State: ${state || 'N/A'} | Status: ${isInternational ? 'INT' : isComingSoon ? 'COMING_SOON' : 'OPERATIONAL'}`);
    } catch (err) {
      console.error(`Failed to parse ${url}:`, err);
    }
  }

  console.log('\n--------------------------------------------------');
  console.log(`TOTAL PARSED LOCATIONS: ${results.length}`);
  console.log(`OPERATIONAL US LOCATIONS: ${results.filter(r => r.status === 'OPERATIONAL' && r.isUsNetwork).length}`);
  console.log(`PUERTO RICO TERRITORY LOCATIONS: ${results.filter(r => r.isUsTerritory).length}`);
  console.log(`COMING SOON / FUTURE LOCATIONS: ${results.filter(r => r.status === 'COMING_SOON').length}`);
  console.log(`INTERNATIONAL LOCATIONS: ${results.filter(r => r.status === 'INTERNATIONAL').length}`);
}

parseAllLocationPages().catch(console.error);
