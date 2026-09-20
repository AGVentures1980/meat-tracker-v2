import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import https from 'https';
import jwt from 'jsonwebtoken';

async function testPublicCutover() {
  console.log('========================================================================');
  console.log('   TESTING PUBLIC REAL HOSTNAME: https://pulse.brasameat.com');
  console.log('========================================================================\n');

  const secret = process.env.PULSE_SSO_SECRET || 'brasa_pulse_sso_production_secret_rotated_2026';
  const token = jwt.sign({
    iss: 'brasa-meat-intelligence',
    aud: 'brasa-brand-pulse',
    userId: 'user-public-cutover-test',
    organizationId: '26e29999-5e6e-4022-bd85-17aec722655e',
    allowedLocationIds: ['3'],
    activeLocationId: '3',
    role: 'GENERAL_MANAGER',
    email: 'public_test@brasameat.com',
    jti: `public-cutover-${Date.now()}`
  }, secret, { expiresIn: 300 });

  const targetUrl = `https://pulse.brasameat.com/api/auth/brasa-meat-sso?token=${token}`;
  console.log(`Sending GET to: ${targetUrl}\n`);

  https.get(targetUrl, (res) => {
    console.log(`PUBLIC RESPONSE STATUS: ${res.statusCode} (Expected: 307)`);
    console.log(`LOCATION HEADER: ${res.headers['location']}`);
    console.log(`SET-COOKIE HEADER: ${res.headers['set-cookie'] ? 'PRESENT' : 'NONE'}`);
    
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(`RESPONSE BODY: ${body || '[Header Redirect - Empty Body]'}`);

      if (res.statusCode === 307 && res.headers['location']?.includes('/dashboard')) {
        console.log('\n✔ SUCCESS: PUBLIC HOSTNAME https://pulse.brasameat.com IS ROUTING DIRECTLY TO BRAND PULSE RECEIVER AND RETURNING HTTP 307 REDIRECT TO DASHBOARD!');
      } else {
        console.log('\n❌ FAILED: PUBLIC HOSTNAME RETURNED NON-307 OR MEAT ERROR!');
      }
    });
  }).on('error', (err) => {
    console.error('HTTPS Request Error:', err);
  });
}

testPublicCutover();
