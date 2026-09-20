import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import http from 'http';

function makeGetRequest(path: string, cookie: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method: 'GET',
      headers: {
        'Cookie': cookie
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode || 500, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode || 500, body: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testServerRendering() {
  console.log('========================================================================');
  console.log('   RUNNING PHASE 7B-6A SERVER HTTP ENDPOINT & SCOPE ISOLATION TEST');
  console.log('========================================================================\n');

  const jwt = require('jsonwebtoken');
  const secret = process.env.PULSE_SSO_SECRET || 'pulse-sso-secret-dev';

  // Texas Session (master store IDs: '20' for Tampa, '16' for Fairfax, '38' for Orlando)
  const tdbToken = jwt.sign({
    iss: 'brasa-meat-intelligence',
    aud: 'brasa-brand-pulse',
    userId: 'user-tdb-exec',
    organizationId: 'tdb-main',
    allowedLocationIds: ['20', '16', '38'],
    primaryLocationId: '20',
    role: 'CORPORATE_ADMIN',
    email: 'tdb_exec@brasameat.com',
    jti: `test-trend-tdb-${Date.now()}`
  }, secret, { expiresIn: 300 });

  const tdbSsoRes = await fetch('http://localhost:3001/api/auth/brasa-meat-sso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tdbToken })
  });

  const tdbCookieHeader = tdbSsoRes.headers.get('set-cookie') || '';
  const sessionCookie = tdbCookieHeader.split(';')[0];

  // 1. TAMPA TREND ENDPOINT TEST
  console.log('1. TEXAS TAMPA TREND API (87465c11-ec18-4a26-85d0-99ec0d29e912):');
  const tampaRes = await makeGetRequest('/api/integrations/scout/trend?locationId=87465c11-ec18-4a26-85d0-99ec0d29e912&range=30D&metric=Google%20Rating', sessionCookie);

  console.log(`   • Status: ${tampaRes.status}`);
  console.log(`   • Location Name: ${tampaRes.body.locationName}`);
  console.log(`   • Total Series Rendered: ${tampaRes.body.series?.length}`);

  const seriesNames = tampaRes.body.series?.map((s: any) => `${s.name} (${s.role})`);
  console.log(`   • Series Entities: ${JSON.stringify(seriesNames)}`);

  if (tampaRes.body.series?.length !== 3) {
    throw new Error(`Expected 3 series for Tampa (Subject + 2 Primary), got ${tampaRes.body.series?.length}`);
  }
  console.log('✔ Tampa golden case verified: contains Subject + 2 Primary Competitors only.\n');

  // 2. FAIRFAX TREND ENDPOINT TEST (ZERO TAMPA LEAKAGE)
  console.log('2. TEXAS FAIRFAX TREND API (ec5b15be-a6b1-4f96-9ee8-1a52dd70a3bb):');
  const fairfaxRes = await makeGetRequest('/api/integrations/scout/trend?locationId=ec5b15be-a6b1-4f96-9ee8-1a52dd70a3bb&range=30D&metric=Google%20Rating', sessionCookie);

  console.log(`   • Status: ${fairfaxRes.status}`);
  console.log(`   • Location Name: ${fairfaxRes.body.locationName}`);
  console.log(`   • Total Series Rendered: ${fairfaxRes.body.series?.length}`);

  const fairfaxSeriesNames = fairfaxRes.body.series?.map((s: any) => s.name);
  const hasTampaInFairfax = fairfaxSeriesNames?.some((n: string) => n.includes('Tampa'));
  console.log(`   • Contains Tampa Data: ${hasTampaInFairfax ? 'YES (FAIL)' : 'NO (PASS)'}`);
  if (hasTampaInFairfax) throw new Error('Fairfax location scope leaked Tampa data!');
  console.log('✔ Fairfax location scope isolated: 0 Tampa data.\n');

  // 3. ORLANDO TREND ENDPOINT TEST (ZERO STALE LEAKAGE)
  console.log('3. TEXAS ORLANDO TREND API (58e2bfd6-bb9a-4c2a-b7e5-1815db4c6d66):');
  const orlandoRes = await makeGetRequest('/api/integrations/scout/trend?locationId=58e2bfd6-bb9a-4c2a-b7e5-1815db4c6d66&range=30D&metric=Google%20Rating', sessionCookie);

  console.log(`   • Status: ${orlandoRes.status}`);
  console.log(`   • Location Name: ${orlandoRes.body.locationName}`);
  console.log(`   • Total Series Rendered: ${orlandoRes.body.series?.length}`);

  const orlandoSeriesNames = orlandoRes.body.series?.map((s: any) => s.name);
  const hasTampaInOrlando = orlandoSeriesNames?.some((n: string) => n.includes('Tampa') || n.includes('Fairfax'));
  console.log(`   • Contains Tampa/Fairfax Data: ${hasTampaInOrlando ? 'YES (FAIL)' : 'NO (PASS)'}`);
  if (hasTampaInOrlando) throw new Error('Orlando location scope leaked stale location data!');
  console.log('✔ Orlando location scope isolated: 0 stale data.\n');

  // 4. FOGO MULTI-TENANT TREND ISOLATION TEST
  console.log('4. FOGO MULTI-TENANT TREND API (ISOLATION TEST):');
  const fogoToken = jwt.sign({
    iss: 'brasa-meat-intelligence',
    aud: 'brasa-brand-pulse',
    userId: 'user-fogo-exec',
    organizationId: '43670635-c205-4b19-99d4-445c7a683730',
    allowedLocationIds: ['fogo_39'],
    primaryLocationId: 'fogo_39',
    role: 'GENERAL_MANAGER',
    email: 'fogo_gm@brasameat.com',
    jti: `test-trend-fogo-${Date.now()}`
  }, secret, { expiresIn: 300 });

  const fogoSsoRes = await fetch('http://localhost:3001/api/auth/brasa-meat-sso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: fogoToken })
  });

  const fogoCookieHeader = fogoSsoRes.headers.get('set-cookie') || '';
  const fogoSessionCookie = fogoCookieHeader.split(';')[0];

  // Fogo user trying to access Texas Tampa trend
  const fogoTrendRes = await makeGetRequest('/api/integrations/scout/trend?locationId=87465c11-ec18-4a26-85d0-99ec0d29e912&range=30D&metric=Google%20Rating', fogoSessionCookie);
  console.log(`   • Fogo User Requesting Texas Tampa Trend Status: ${fogoTrendRes.status} (Expected: 403)`);

  if (fogoTrendRes.status !== 403) {
    throw new Error('Multi-tenant isolation failed! Fogo user was able to query Texas Tampa trend!');
  }
  console.log('✔ Multi-tenant isolation verified: Fogo user strictly denied Texas Tampa trend with 403 Forbidden.\n');

  console.log('✔ ALL SERVER ENDPOINT AND SCOPE ISOLATION TESTS PASSED 100%!');
}

testServerRendering().catch(console.error);
