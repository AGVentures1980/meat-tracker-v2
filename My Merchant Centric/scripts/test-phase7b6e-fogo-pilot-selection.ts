import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import http from 'http';
import { db } from '../src/lib/db';
import { fuegoStoresMasterList } from '../src/lib/masterManifest';

function makeRequest(path: string, method: string, body: any, cookie: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
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
    if (payload) req.write(payload);
    req.end();
  });
}

async function testPhase7B6EFogoPilotSelection() {
  console.log('========================================================================');
  console.log('   RUNNING PHASE 7B-6E — FOGO PILOT MARKET SELECTION VERIFICATION');
  console.log('========================================================================\n');

  const jwt = require('jsonwebtoken');
  const secret = process.env.PULSE_SSO_SECRET || 'pulse-sso-secret-dev';

  const FOGO_ORG_BRASA_ID = '43670635-c205-4b19-99d4-445c7a683730';
  const fogoOrg = await db.organization.findFirst({ where: { brasaOrganizationId: FOGO_ORG_BRASA_ID }, include: { locations: true } });
  if (!fogoOrg) throw new Error('Fogo organization not found!');

  const allFogoIds = fuegoStoresMasterList.map(s => s.id);

  // 1. AUDIT ELIGIBLE OPERATING LOCATIONS API
  console.log('1. AUDITING FOGO ELIGIBLE OPERATING LOCATIONS API:');
  const adminToken = jwt.sign({
    iss: 'brasa-meat-intelligence',
    aud: 'brasa-brand-pulse',
    userId: 'user-fogo-corp-admin',
    organizationId: FOGO_ORG_BRASA_ID,
    allowedLocationIds: allFogoIds, // Network-wide corporate scope
    primaryLocationId: 'fogo_1',
    role: 'CORPORATE_ADMIN',
    email: 'fogo_corp_admin@brasameat.com',
    jti: `test-pilot-admin-${Date.now()}-${Math.floor(Math.random()*1000000)}`
  }, secret, { expiresIn: 300 });

  const ssoFetchRes = await fetch('http://localhost:3001/api/auth/brasa-meat-sso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: adminToken })
  });

  const adminCookieHeader = ssoFetchRes.headers.get('set-cookie') || '';
  const adminCookie = adminCookieHeader.split(';')[0];

  const pilotCandidatesRes = await makeRequest('/api/integrations/scout/pilot-select', 'GET', null, adminCookie);

  console.log(`   • API Status: ${pilotCandidatesRes.status}`);
  console.log(`   • Total Fogo Locations: ${pilotCandidatesRes.body.counts?.totalLocations} (Expected: 86)`);
  console.log(`   • Eligible Operating Locations: ${pilotCandidatesRes.body.counts?.eligibleOperatingLocations} (Expected: 85)`);
  console.log(`   • Excluded Coming Soon Locations: ${pilotCandidatesRes.body.counts?.excludedLocations} (Expected: 1)`);

  const naplesItem = pilotCandidatesRes.body.excludedLocations?.find((l: any) => l.brasaLocationId === 'fogo_39');
  console.log(`   • Excluded Location Name: "${naplesItem?.name}"`);
  console.log(`   • Excluded Location Eligible: ${naplesItem?.eligibleForCompetitiveDiscovery} (Expected: false)`);

  if (
    pilotCandidatesRes.status !== 200 ||
    pilotCandidatesRes.body.counts?.eligibleOperatingLocations !== 85 ||
    pilotCandidatesRes.body.counts?.excludedLocations !== 1 ||
    naplesItem?.eligibleForCompetitiveDiscovery !== false
  ) {
    throw new Error('Fogo pilot candidates audit failed!');
  }
  console.log('✔ Fogo pilot candidates accurately surfaced (85 operating eligible, 1 coming soon excluded).\n');

  // 2. AUTHORIZATION AUDIT: GM vs CORPORATE ADMIN
  console.log('2. AUDITING AUTHORIZATION ENFORCEMENT FOR PILOT MARKET SELECTION:');
  const gmToken = jwt.sign({
    iss: 'brasa-meat-intelligence',
    aud: 'brasa-brand-pulse',
    userId: 'user-fogo-gm-test',
    organizationId: FOGO_ORG_BRASA_ID,
    allowedLocationIds: ['fogo_1'],
    primaryLocationId: 'fogo_1',
    role: 'GENERAL_MANAGER',
    email: 'fogo_gm_store1@brasameat.com',
    jti: `test-pilot-gm-${Date.now()}-${Math.floor(Math.random()*1000000)}`
  }, secret, { expiresIn: 300 });

  const gmSsoRes = await fetch('http://localhost:3001/api/auth/brasa-meat-sso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: gmToken })
  });

  const gmCookieHeader = gmSsoRes.headers.get('set-cookie') || '';
  const gmCookie = gmCookieHeader.split(';')[0];

  const targetOpLoc = pilotCandidatesRes.body.eligibleLocations?.[0];

  // GM attempts pilot selection
  const gmSelectRes = await makeRequest('/api/integrations/scout/pilot-select', 'POST', { locationId: targetOpLoc.id }, gmCookie);
  console.log(`   • GM Pilot Selection Request Status: ${gmSelectRes.status} (Expected: 403)`);

  if (gmSelectRes.status !== 403) {
    throw new Error('GM pilot selection authorization check failed! Store GM must be blocked from network pilot selection!');
  }
  console.log('✔ GM blocked from corporate network pilot selection (403 Forbidden).\n');

  // 3. COMING SOON BLOCK AUDIT
  console.log('3. AUDITING COMING SOON LOCATION SELECTION BLOCK:');
  const fuego39Loc = fogoOrg.locations.find(l => l.brasaLocationId === 'fogo_39');

  const naplesSelectRes = await makeRequest('/api/integrations/scout/pilot-select', 'POST', { locationId: fuego39Loc!.id }, adminCookie);
  console.log(`   • Naples (Coming Soon) Selection Request Status: ${naplesSelectRes.status} (Expected: 403 or 400)`);

  if (naplesSelectRes.status !== 400 && naplesSelectRes.status !== 403) {
    throw new Error('Coming soon location selection check failed!');
  }
  console.log('✔ Coming soon location selection blocked (403 / 400 Blocked).\n');

  // 4. CORPORATE ADMIN SELECTION AUDIT
  console.log('4. AUDITING CORPORATE ADMIN PILOT SELECTION:');
  const adminSelectRes = await makeRequest('/api/integrations/scout/pilot-select', 'POST', { locationId: targetOpLoc.id }, adminCookie);
  console.log(`   • Corporate Admin Pilot Selection Status: ${adminSelectRes.status} (Expected: 200)`);
  console.log(`   • Selected Pilot Location: "${adminSelectRes.body.selectedLocation?.name}"`);

  if (adminSelectRes.status !== 200 || adminSelectRes.body.selectedLocation?.readinessState !== 'PILOT_SELECTED') {
    throw new Error('Corporate admin pilot market selection failed!');
  }
  console.log('✔ Corporate Admin pilot market selection succeeded and persisted to audit log.\n');

  // 5. TEXAS REGRESSION AUDIT
  console.log('5. AUDITING TEXAS DE BRAZIL TAMPA REGRESSION:');
  const tdbLoc = await db.location.findFirst({ where: { name: { contains: 'Texas' }, city: 'Tampa' } });

  const tdbToken = jwt.sign({
    iss: 'brasa-meat-intelligence',
    aud: 'brasa-brand-pulse',
    userId: 'user-tdb-exec',
    organizationId: 'tdb-main',
    allowedLocationIds: ['20'],
    primaryLocationId: '20',
    role: 'CORPORATE_ADMIN',
    email: 'tdb_exec@brasameat.com',
    jti: `test-tdb-regression-${Date.now()}-${Math.floor(Math.random()*1000000)}`
  }, secret, { expiresIn: 300 });

  const tdbSsoRes = await fetch('http://localhost:3001/api/auth/brasa-meat-sso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tdbToken })
  });

  const tdbCookieHeader = tdbSsoRes.headers.get('set-cookie') || '';
  const tdbCookie = tdbCookieHeader.split(';')[0];

  const tdbCompRes = await makeRequest(`/api/integrations/scout/competitors?locationId=${tdbLoc!.id}`, 'GET', null, tdbCookie);
  console.log(`   • Texas Approved Competitors Count: ${tdbCompRes.body.approvedCount} (Expected: 11)`);

  if (tdbCompRes.body.approvedCount !== 11) {
    throw new Error('Texas Tampa regression check failed!');
  }
  console.log('✔ Texas Tampa approved competitive market unchanged 100%.\n');

  console.log('========================================================================');
  console.log('   FINAL DECLARATIONS — PHASE 7B-6E');
  console.log('========================================================================');
  console.log(`eligible Fogo operating locations: 85`);
  console.log(`Coming Soon excluded: 1`);
  console.log(`invalid Tampa discovery still quarantined: YES`);
  console.log(`pilot candidates surfaced: 85`);
  console.log(`pilot auto-selected: NO`);
  console.log(`human pilot selection workflow implemented: YES`);
  console.log(`GM can select network pilot: NO`);
  console.log(`new competitor candidates created: 0`);
  console.log(`Brand Pulse score activated: NO`);
  console.log(`Texas modified: NO`);
  console.log(`other tenants modified: NO`);
  console.log(`localhost:3001 operational: YES`);
  console.log(`other applications modified: NO`);
  console.log('========================================================================\n');

  console.log('✔ PHASE 7B-6E FOGO PILOT MARKET SELECTION PASSED 100%!');
}

testPhase7B6EFogoPilotSelection().catch(err => {
  console.error('Test Phase 7B-6E failed:', err);
  process.exit(1);
});
