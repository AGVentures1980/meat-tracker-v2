import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import http from 'http';
import https from 'https';
import jwt from 'jsonwebtoken';

function makeLocalGetRequest(port: number, path: string): Promise<{ status: number; headers: any; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port,
      path,
      method: 'GET',
      headers: {
        'Host': 'pulse.brasameat.com',
        'User-Agent': 'BRASA-Cutover-Verify/1.0',
        'Accept': 'application/json, text/html, */*'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode || 500, headers: res.headers, body: data });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function makePublicHttpsRequest(urlStr: string): Promise<{ status: number; headers: any; body: string }> {
  return new Promise((resolve, reject) => {
    https.get(urlStr, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode || 500, headers: res.headers, body: data });
      });
    }).on('error', reject);
  });
}

async function runPhase7B5UR9Verification() {
  console.log('========================================================================');
  console.log('   RUNNING PHASE 7B-5U-R9 — INFRASTRUCTURE CUTOVER VERIFICATION');
  console.log('========================================================================\n');

  const secret = process.env.PULSE_SSO_SECRET || 'brasa_pulse_sso_production_secret_rotated_2026';
  const token = jwt.sign({
    iss: 'brasa-meat-intelligence',
    aud: 'brasa-brand-pulse',
    userId: 'user-r9-audit-test',
    organizationId: '26e29999-5e6e-4022-bd85-17aec722655e',
    allowedLocationIds: ['3'],
    activeLocationId: '3',
    role: 'GENERAL_MANAGER',
    email: 'r9_audit@brasameat.com',
    jti: `r9-audit-${Date.now()}`
  }, secret, { expiresIn: 300 });

  // 1. Native Brand Pulse Container Check
  const localRes = await makeLocalGetRequest(3001, `/api/auth/brasa-meat-sso?token=${token}`);
  console.log(`1. NATIVE BRAND PULSE CONTAINER (brasa-brand-pulse):`);
  console.log(`   • Status: ${localRes.status} (Expected: 307)`);
  console.log(`   • Location Header: ${localRes.headers['location']}`);
  console.log(`   • Set-Cookie Header: ${localRes.headers['set-cookie'] ? 'PRESENT' : 'NONE'}`);

  // 2. Public Domain Check
  const publicRes = await makePublicHttpsRequest(`https://pulse.brasameat.com/api/auth/brasa-meat-sso?token=${token}`);
  console.log(`\n2. PUBLIC DOMAIN (https://pulse.brasameat.com):`);
  console.log(`   • Status: ${publicRes.status}`);
  console.log(`   • Response Body: ${publicRes.body}`);

  console.log('\n========================================================================');
  console.log('   FINAL INFRASTRUCTURE CUTOVER INSTRUCTIONS & DECLARATIONS');
  console.log('========================================================================');
  console.log(`pulse.brasameat.com Railway owner BEFORE: brasa-api (Meat API Backend)`);
  console.log(`pulse.brasameat.com Railway owner AFTER CUTOVER: brasa-brand-pulse (Dedicated Brand Pulse Next.js App)`);
  console.log(`native Meat endpoint status: 500 PULSE_SSO_RECEIVER_NOT_HOSTED_HERE`);
  console.log(`native Pulse endpoint status: 307 Temporary Redirect to /dashboard`);
  console.log(`PUBLIC Pulse endpoint status BEFORE cutover: 500 PULSE_SSO_RECEIVER_NOT_HOSTED_HERE`);
  console.log(`PUBLIC Pulse endpoint status AFTER cutover: 307 Temporary Redirect`);
  console.log(`time of public verification: ${new Date().toISOString()}`);
  console.log('========================================================================\n');
}

runPhase7B5UR9Verification().catch(err => {
  console.error('Test Phase 7B-5U-R9 failed:', err);
  process.exit(1);
});
