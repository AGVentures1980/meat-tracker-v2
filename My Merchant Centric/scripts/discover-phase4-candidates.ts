import { db } from '../src/lib/db';
import { GooglePlacesAdapter } from '../src/lib/scout/adapters/googlePlacesAdapter';

async function discoverPhase4CandidatesStrict() {
  console.log('==================================================');
  console.log('STRICT GOOGLE PLACES API CANDIDATE DISCOVERY');
  console.log('==================================================\n');

  const adapter = new GooglePlacesAdapter();
  const adapterHealth = await adapter.healthCheck();
  console.log(`Google Places Adapter Health: ${adapterHealth}`);

  if (adapterHealth !== 'OPERATIONAL') {
    console.warn(`\n[DATA GOVERNANCE RULE] Google Places API Key is NOT operational (${adapterHealth}).`);
    console.warn(`Strict Real-Data Policy Prohibits local candidate synthesis or fallback fixtures.`);
    console.warn(`Discovery halted. 0 candidates added to LIVE.`);
    return;
  }

  // Real candidate discovery requires operational API key
  const places = await adapter.discoverPlaces('Brazilian Steakhouse Tampa FL');
  console.log(`Discovered ${places.length} official raw place(s) from Google Places API.`);
}

discoverPhase4CandidatesStrict().catch(console.error);
