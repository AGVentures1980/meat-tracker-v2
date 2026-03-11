const fetch = require('node-fetch');

async function poll() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('https://meat-intelligence-final.up.railway.app/api/v1/public-debug/seed-fdc?key=fatality');
      const text = await res.text();
      // If it doesn't say "Invalid script parameter", then our NEW code is live!
      if (!text.includes('Invalid script parameter') && !text.toLowerCase().includes('<!doctype html>')) {
        console.log('NEW DEPLOYMENT IS LIVE!');
        console.log(text);
        return true;
      }
    } catch (e) {}
    console.log(`Polling attempt ${i+1}... still got old deployment.`);
    await new Promise(r => setTimeout(r, 6000));
  }
}
poll();
