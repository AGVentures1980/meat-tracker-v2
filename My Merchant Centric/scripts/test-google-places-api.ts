import fs from 'fs';
import path from 'path';

async function diagnoseGooglePlacesKey() {
  console.log('==================================================');
  console.log('GOOGLE PLACES API DIAGNOSTICS & LIVE READ');
  console.log('==================================================\n');

  let apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const envPath = path.join(process.cwd(), '.env');

  if (!apiKey && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GOOGLE_PLACES_API_KEY=["']?([^"'\r\n]+)["']?/);
    if (match) apiKey = match[1];
  }

  const present = !!apiKey;
  const nonEmpty = !!apiKey && apiKey.trim().length > 0;
  const keyLength = apiKey ? apiKey.length : 0;
  const safeFingerprint = apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : 'N/A';

  console.log(`• API Key Present: ${present ? 'YES' : 'NO'}`);
  console.log(`• API Key Non-Empty: ${nonEmpty ? 'YES' : 'NO'}`);
  console.log(`• Active Environment File: .env`);
  console.log(`• Key Length: ${keyLength} chars`);
  console.log(`• Safe Fingerprint: ${safeFingerprint}`);

  if (!apiKey) {
    console.error('❌ GOOGLE_PLACES_API_KEY is missing');
    return;
  }

  const targetPlaceId = 'ChIJHdigC67DwogRkWjPRn8SUbQ'; // Texas de Brazil Tampa

  // Test 1: Places API (New v1) Endpoint
  console.log('\n[TEST 1] Testing Places API (v1 New)...');
  let v1Success = false;
  let v1Status = 0;
  let v1Error = '';

  try {
    const url = `https://places.googleapis.com/v1/places/${targetPlaceId}`;
    const headers = {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,rating,userRatingCount,businessStatus'
    };
    const res = await fetch(url, { method: 'GET', headers });
    v1Status = res.status;

    if (res.ok) {
      const data = await res.json();
      v1Success = true;
      console.log('✔ Places API (v1 New) SUCCESSFUL!');
      console.log(`  - Exact Display Name: ${data.displayName?.text}`);
      console.log(`  - Rating: ${data.rating} ★`);
      console.log(`  - Review Count: ${data.userRatingCount}`);
      console.log(`  - Business Status: ${data.businessStatus || 'OPERATIONAL'}`);
    } else {
      const errText = await res.text();
      v1Error = errText;
      console.warn(`  - HTTP Status: ${res.status}`);
      console.warn(`  - Error: ${errText.substring(0, 150)}...`);
    }
  } catch (err: any) {
    v1Error = err.message;
    console.error(`  - Fetch Error: ${err.message}`);
  }

  // Test 2: Places API (Legacy Maps API) Endpoint
  console.log('\n[TEST 2] Testing Places API (Legacy Maps API)...');
  let legacySuccess = false;
  let legacyStatus = 0;

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${targetPlaceId}&fields=name,rating,user_ratings_total,business_status,formatted_address&key=${apiKey}`;
    const res = await fetch(url);
    legacyStatus = res.status;

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'OK' && data.result) {
        legacySuccess = true;
        console.log('✔ Places API (Legacy Maps API) SUCCESSFUL!');
        console.log(`  - Exact Display Name: ${data.result.name}`);
        console.log(`  - Rating: ${data.result.rating} ★`);
        console.log(`  - Review Count: ${data.result.user_ratings_total}`);
        console.log(`  - Business Status: ${data.result.business_status || 'OPERATIONAL'}`);
      } else {
        console.warn(`  - API Status: ${data.status}`);
        console.warn(`  - Error Message: ${data.error_message || 'N/A'}`);
      }
    } else {
      console.warn(`  - HTTP Status: ${res.status}`);
    }
  } catch (err: any) {
    console.error(`  - Fetch Error: ${err.message}`);
  }

  console.log('\n--------------------------------------------------');
  console.log('DIAGNOSTIC SUMMARY:');
  console.log(`• Adapter Status: ${v1Success || legacySuccess ? 'OPERATIONAL' : 'DEGRADED / API_ERROR'}`);
  console.log(`• HTTP Status: v1 New (${v1Status}) | Legacy (${legacyStatus})`);
  console.log(`• Google Places Reachable: ${v1Success || legacySuccess ? 'YES' : 'NO'}`);
  if (!v1Success && !legacySuccess) {
    console.log(`• Sanitized Error: ${v1Error.replace(apiKey, '[REDACTED]')}`);
  }
  console.log('--------------------------------------------------\n');
}

diagnoseGooglePlacesKey().catch(console.error);
