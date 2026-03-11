const fetch = require('node-fetch');

async function poll() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('https://meat-intelligence-final.up.railway.app/api/v1/public-debug/seed-fdc?key=fatality');
      const text = await res.text();
      // If it doesn't start with <!doctype html>, it means our API caught the request!
      if (!text.toLowerCase().includes('<!doctype html>')) {
        console.log('Got JSON API Response! Deployment is LIVE!');
        console.log(text);
        return true;
      }
    } catch (e) {}
    console.log(`Polling attempt ${i+1}... waiting 5s`);
    await new Promise(r => setTimeout(r, 5000));
  }
}
poll();
