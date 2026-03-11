const fetch = require('node-fetch');

async function poll() {
  console.log('Waiting 30s for build...');
  await new Promise(r => setTimeout(r, 30000));
  
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('https://meat-intelligence-final.up.railway.app/api/v1/public-debug/seed-fdc?key=fatality');
      const text = await res.text();
      // If it doesn't contain "Argument `location` is missing", it means our schema fix is live, or it succeeded!
      if (!text.includes('Argument `location` is missing') && !text.toLowerCase().includes('<!doctype html>')) {
        console.log('NEW FIX IS LIVE!');
        console.log(text);
        return true;
      }
    } catch (e) {}
    console.log(`Polling attempt ${i+1}... still got old deployment missing 'location'.`);
    await new Promise(r => setTimeout(r, 6000));
  }
}
poll();
