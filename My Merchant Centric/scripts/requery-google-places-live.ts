import { GooglePlacesAdapter } from '../src/lib/scout/adapters/googlePlacesAdapter';

async function requeryGooglePlacesLive() {
  console.log('==================================================');
  console.log('RE-QUERYING GOOGLE PLACES API LIVE FOR CANDIDATES');
  console.log('==================================================\n');

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  console.log(`API Key Configured: ${apiKey ? 'YES (Masked: ' + apiKey.substring(0, 6) + '...)' : 'NO'}`);

  const candidatesToQuery = [
    'Terra Gaucha Brazilian Steakhouse Tampa',
    'El Churrascaso Grill Tampa',
    'Fogo de Chão Tampa',
    'Brazas Grill Tampa',
    'Boizão Brazilian Steakhouse Tampa'
  ];

  for (const query of candidatesToQuery) {
    console.log(`\nQuerying Google Places textSearch for: "${query}"...`);
    try {
      const url = 'https://places.googleapis.com/v1/places:searchText';
      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey!,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.businessStatus'
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ textQuery: query })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP Error ${response.status}: ${errorText}`);
        continue;
      }

      const data = await response.json();
      const places = data.places || [];

      if (places.length === 0) {
        console.warn(`⚠️ No places returned by Google for query "${query}"`);
      } else {
        places.slice(0, 2).forEach((p: any, idx: number) => {
          console.log(`  [Match ${idx + 1}]`);
          console.log(`  - Display Name: ${p.displayName?.text}`);
          console.log(`  - Place ID: ${p.id}`);
          console.log(`  - Formatted Address: ${p.formattedAddress}`);
          console.log(`  - Rating: ${p.rating} ★`);
          console.log(`  - User Rating Count: ${p.userRatingCount}`);
          console.log(`  - Location Coordinates: Lat ${p.location?.latitude}, Lng ${p.location?.longitude}`);
          console.log(`  - Business Status: ${p.businessStatus || 'OPERATIONAL'}`);
        });
      }
    } catch (err: any) {
      console.error(`❌ Error querying "${query}": ${err.message}`);
    }
  }
}

requeryGooglePlacesLive().catch(console.error);
