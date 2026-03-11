const fetch = require('node-fetch');

async function checkDeployment() {
  console.log('Waiting for deployment to go live...');
  for(let i=0; i<30; i++) {
    try {
      const res = await fetch('https://meat-intelligence-final.up.railway.app/health');
      if (res.ok) {
        console.log('Deployment is live!');
        return true;
      }
    } catch(e) {}
    await new Promise(r => setTimeout(r, 5000));
  }
  return false;
}

async function run() {
  await new Promise(r => setTimeout(r, 10000)); // wait a bit for build
  await checkDeployment();
  // Ensure the public endpoint works by running a dummy script first (e.g. check-users.js)
  // Or just run the real ones directly.
  
  console.log('Running update_fdc_bacon_stores.js...');
  const res1 = await fetch('https://meat-intelligence-final.up.railway.app/api/v1/public-debug/seed-fdc?script=update_fdc_bacon_stores.js');
  console.log(await res1.json());

  console.log('Running sync_fdc_proteins_and_am.js...');
  const res2 = await fetch('https://meat-intelligence-final.up.railway.app/api/v1/public-debug/seed-fdc?script=sync_fdc_proteins_and_am.js');
  console.log(await res2.json());
}
run();
