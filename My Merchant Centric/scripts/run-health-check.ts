import * as fs from 'fs';
import * as path from 'path';

// Manually parse .env to avoid external dotenv type import errors
try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('GOOGLE_PLACES_API_KEY=')) {
      const value = line.split('=')[1].replace(/["']/g, '').trim();
      process.env.GOOGLE_PLACES_API_KEY = value;
    }
  }
} catch (e) {
  console.error('Error loading .env file manually:', e);
}

async function run() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.log('Error: GOOGLE_PLACES_API_KEY missing in environment.');
    return;
  }

  const url = 'https://places.googleapis.com/v1/places:searchText';
  const headers = {
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'places.id,places.displayName',
    'Content-Type': 'application/json',
  };

  const body = {
    textQuery: 'Texas de Brazil Tampa, Tampa, FL',
  };

  console.log('Sending Text Search (New) request to places.googleapis.com...');
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('HTTP status:', response.status);
    console.log('Request reached places.googleapis.com: YES');

    const bodyText = await response.text();
    let parsedBody: any = null;
    try {
      parsedBody = JSON.parse(bodyText);
    } catch (e) {}

    if (response.ok) {
      console.log('Search succeeded: YES');
      const places = parsedBody.places || [];
      if (places.length > 0) {
        const place = places[0];
        console.log('real Place ID:', place.id);
        const name = typeof place.displayName === 'object' ? place.displayName?.text : place.displayName;
        console.log('real display name:', name);
      } else {
        console.log('No places returned in search results.');
      }
    } else {
      console.log('Search succeeded: NO');
      if (parsedBody && parsedBody.error) {
        console.log('Google error status:', parsedBody.error.status || 'unknown');
        console.log('Google error message:', parsedBody.error.message || 'unknown');
        console.log('Google error details:', JSON.stringify(parsedBody.error.details || null));
      } else {
        console.log('Raw Google Error Body:', bodyText);
      }
    }
  } catch (err: any) {
    console.log('Search succeeded: NO');
    console.log('Request reached places.googleapis.com: NO');
    console.log('Connection/Fetch Error:', err.message);
  }
}

run();
