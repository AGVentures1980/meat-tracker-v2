import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
let apiKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('GOOGLE_PLACES_API_KEY=')) {
      apiKey = line.replace('GOOGLE_PLACES_API_KEY=', '').trim().replace(/^["']|["']$/g, '');
    }
  }
}

async function testChurrascasoPlaces() {
  console.log('--- TESTING OFFICIAL GOOGLE PLACES API FOR CHURRASCASO ---');
  console.log(`API Key Fingerprint: ${apiKey.substring(0, 8)}... (Length: ${apiKey.length})`);

  const id1 = 'ChIJATbxbGrpwogRC4OgXnnmLwU'; // 8425 W Hillsborough Ave (Physical Store)
  const id2 = 'ChIJbV02xLDDwogR92jL0P3g1AA'; // Legacy Place ID

  for (const pid of [id1, id2]) {
    console.log(`\nQuerying Google Place Details for ${pid}...`);
    const url = `https://places.googleapis.com/v1/places/${pid}`;
    const headers = {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,userRatingCount,businessStatus,primaryType,priceLevel'
    };

    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      console.log(`✔ OK: "${data.displayName?.text}" | Place ID: ${data.id} | Address: ${data.formattedAddress} | Rating: ${data.rating}★ (${data.userRatingCount} reviews) | Status: ${data.businessStatus}`);
    } else {
      console.log(`❌ Error ${res.status}: ${await res.text()}`);
    }
  }
}

testChurrascasoPlaces().catch(console.error);
