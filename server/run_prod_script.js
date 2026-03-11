const fetch = require('node-fetch');
async function run() {
  const loginRes = await fetch('https://meat-intelligence-final.up.railway.app/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexandre@alexgarciaventures.co', password: 'alexpassword!' }) // Trying original or standard pw
  });
  const data = await loginRes.json();
  if (!data.token) {
    console.log('Login failed', data);
    return;
  }
  const token = data.token;
  
  const script1 = process.argv[2];
  console.log(`Running ${script1}...`);
  const res1 = await fetch(`https://meat-intelligence-final.up.railway.app/api/v1/dashboard/debug/seed-fdc?script=${script1}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Result:', await res1.json());
}
run();
