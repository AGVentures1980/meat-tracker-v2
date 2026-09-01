import https from 'https';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function testPlacesApi() {
  console.log('==================================================');
  console.log('TESTING GOOGLE PLACES API RESOLUTION');
  console.log('==================================================\n');

  console.log(`API Key configured: ${API_KEY ? 'YES (' + API_KEY.substring(0, 8) + '...)' : 'NO'}`);

  if (!API_KEY) {
    console.log('No Google Places API key found in environment.');
    return;
  }

  // Test Place Details query for Tampa: ChIJHdigC67DwogRkWjPRn8SUbQ
  const tampaUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=ChIJHdigC67DwogRkWjPRn8SUbQ&fields=name,formatted_address,place_id,business_status,rating,user_ratings_total&key=${API_KEY}`;

  try {
    const res = await fetchJson(tampaUrl);
    console.log('Tampa Place Details Response Status:', res.status);
    if (res.result) {
      console.log('  • Name:', res.result.name);
      console.log('  • Address:', res.result.formatted_address);
      console.log('  • Authentic Place ID:', res.result.place_id);
      console.log('  • Business Status:', res.result.business_status);
      console.log('  • Rating:', res.result.rating);
      console.log('  • Review Count:', res.result.user_ratings_total);
    }
  } catch (err) {
    console.error('Error querying Google Places API:', err);
  }
}

testPlacesApi().catch(console.error);
