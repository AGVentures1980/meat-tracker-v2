const fetch = require('node-fetch');
async function test() {
  // Login to live API
  const loginRes = await fetch('https://meat-intelligence-final.up.railway.app/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexandre@alexgarciaventures.co', password: 'brasa_admin_temp!' })
  });
  const loginData = await loginRes.json();
  if (!loginData.token) {
    console.log('Login failed', loginData);
    return;
  }
  console.log('Logged in. Token retrieved. Role:', loginData.user.role, 'CompanyId:', loginData.user.companyId);

  // Fetch products
  const pRes = await fetch('https://meat-intelligence-final.up.railway.app/api/v1/dashboard/settings/company-products', {
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  });
  const products = await pRes.json();
  console.log('Products:', products);
}
test();
