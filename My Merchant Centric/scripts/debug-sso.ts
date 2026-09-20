import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});
import jwt from 'jsonwebtoken';

async function run() {
  const secret = process.env.PULSE_SSO_SECRET || 'brasa_pulse_sso_production_secret_rotated_2026';
  const token = jwt.sign({
    iss: 'brasa-meat-intelligence',
    aud: 'brasa-brand-pulse',
    userId: 'user-r11-debug-3',
    organizationId: '26e29999-5e6e-4022-bd85-17aec722655e',
    allowedLocationIds: ['3'],
    activeLocationId: '3',
    role: 'GENERAL_MANAGER',
    email: 'debug_3@brasameat.com',
    jti: `r11-debug-${Date.now()}`
  }, secret, { expiresIn: 300 });

  const res = await fetch(`http://localhost:3001/api/auth/brasa-meat-sso?token=${token}`, {
    redirect: 'manual'
  });

  console.log('STATUS:', res.status);
  console.log('LOCATION HEADER:', res.headers.get('location'));
  console.log('BODY:', await res.text());
}
run();
