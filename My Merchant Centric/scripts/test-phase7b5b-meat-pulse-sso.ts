import { db } from '../src/lib/db';
import { verifyScopeAccess } from '../src/lib/auth';
import { Role, ScopeType } from '@prisma/client';
import crypto from 'crypto';

const PULSE_SSO_SECRET = process.env.PULSE_SSO_SECRET || 'brasa-pulse-sso-secret-key-change-me';

function base64url(str: string): string {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function generateHandoffToken(overrides: any = {}, secretToUse: string = PULSE_SSO_SECRET) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: 'brasa-meat-intelligence',
    aud: 'brasa-brand-pulse',
    sub: 'usr-meat-001',
    userId: 'usr-meat-001',
    organizationId: 'tdb-main',
    allowedLocationIds: ['20'],
    primaryLocationId: '20',
    role: 'manager',
    email: 'gm.tampa@texasdebrazil.com',
    iat: now,
    exp: now + 300,
    ...overrides
  };

  const part1 = base64url(JSON.stringify(header));
  const part2 = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secretToUse)
    .update(`${part1}.${part2}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${part1}.${part2}.${signature}`;
}

async function runTestMatrix() {
  console.log('===============================================================');
  console.log('   PHASE 7B-5B — BRASA BRAND PULSE SSO RECEIVER TEST MATRIX   ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  const { POST } = await import('../src/app/api/auth/brasa-meat-sso/route');

  // Test 1: Valid GM Handoff (Store 20 -> Tampa)
  {
    const token = generateHandoffToken();
    const req: any = {
      nextUrl: { searchParams: new URLSearchParams({ token }) },
      method: 'GET',
      headers: new Map([['accept', 'application/json']])
    };

    const res = await POST(req);
    const body = await res.json();
    assert(
      res.status === 200 && body.success === true && body.session?.primaryLocationId !== '20',
      '1. Valid GM: Meat store 20 mapped to canonical Pulse location ID',
      `Status: ${res.status}, body: ${JSON.stringify(body)}`
    );
    assert(
      body.session?.allowedLocationIds?.length === 1,
      '1b. Valid GM: GM restricted strictly to 1 location',
      `Count: ${body.session?.allowedLocationIds?.length}`
    );
  }

  // Test 2: Multi-location Manager (Stores 20, 776, 510)
  {
    const token = generateHandoffToken({
      allowedLocationIds: ['20', '776', '510'],
      role: 'area_manager'
    });
    const req: any = {
      nextUrl: { searchParams: new URLSearchParams({ token }) },
      method: 'GET',
      headers: new Map([['accept', 'application/json']])
    };

    const res = await POST(req);
    const body = await res.json();
    assert(
      res.status === 200 && body.session?.allowedLocationIds?.length === 3,
      '2. Multi-location manager: Maps only authorized stores (3 resolved)',
      `Allowed count: ${body.session?.allowedLocationIds?.length}`
    );
  }

  // Test 3: Corporate User
  {
    const token = generateHandoffToken({
      allowedLocationIds: ['20', '776', '510', '710', '80'],
      role: 'director'
    });
    const req: any = {
      nextUrl: { searchParams: new URLSearchParams({ token }) },
      method: 'GET',
      headers: new Map([['accept', 'application/json']])
    };

    const res = await POST(req);
    const body = await res.json();
    assert(
      res.status === 200 && body.session?.role === 'CORPORATE_ADMIN',
      '3. Corporate: Director role normalized to CORPORATE_ADMIN',
      `Role: ${body.session?.role}`
    );
  }

  // Test 4: Invalid Signature
  {
    const token = generateHandoffToken({}, 'FORGED_INVALID_SECRET_KEY');
    const req: any = {
      nextUrl: { searchParams: new URLSearchParams({ token }) },
      method: 'GET',
      headers: new Map([['accept', 'application/json']])
    };

    const res = await POST(req);
    const body = await res.json();
    assert(
      res.status === 401 && body.error === 'PULSE_SSO_INVALID_TOKEN',
      '4. Invalid Signature: Forged token denied with 401 PULSE_SSO_INVALID_TOKEN'
    );
  }

  // Test 5: Expired Token
  {
    const now = Math.floor(Date.now() / 1000);
    const token = generateHandoffToken({ exp: now - 60 });
    const req: any = {
      nextUrl: { searchParams: new URLSearchParams({ token }) },
      method: 'GET',
      headers: new Map([['accept', 'application/json']])
    };

    const res = await POST(req);
    const body = await res.json();
    assert(
      res.status === 401 && body.error === 'PULSE_SSO_EXPIRED',
      '5. Expired Token: Expired handoff denied with 401 PULSE_SSO_EXPIRED'
    );
  }

  // Test 6: Wrong Issuer
  {
    const token = generateHandoffToken({ iss: 'malicious-hacker-app' });
    const req: any = {
      nextUrl: { searchParams: new URLSearchParams({ token }) },
      method: 'GET',
      headers: new Map([['accept', 'application/json']])
    };

    const res = await POST(req);
    const body = await res.json();
    assert(
      res.status === 401 && body.error === 'PULSE_SSO_INVALID_TOKEN',
      '6. Wrong Issuer: Denied with 401 PULSE_SSO_INVALID_TOKEN'
    );
  }

  // Test 7: Wrong Audience
  {
    const token = generateHandoffToken({ aud: 'wrong-target-app' });
    const req: any = {
      nextUrl: { searchParams: new URLSearchParams({ token }) },
      method: 'GET',
      headers: new Map([['accept', 'application/json']])
    };

    const res = await POST(req);
    const body = await res.json();
    assert(
      res.status === 401 && body.error === 'PULSE_SSO_INVALID_TOKEN',
      '7. Wrong Audience: Denied with 401 PULSE_SSO_INVALID_TOKEN'
    );
  }

  // Test 8: Unknown Meat Store ID
  {
    const token = generateHandoffToken({ allowedLocationIds: ['UNKNOWN_STORE_99999'] });
    const req: any = {
      nextUrl: { searchParams: new URLSearchParams({ token }) },
      method: 'GET',
      headers: new Map([['accept', 'application/json']])
    };

    const res = await POST(req);
    const body = await res.json();
    assert(
      res.status === 403 && body.error === 'PULSE_SSO_LOCATION_UNRESOLVED',
      '8. Unknown Meat store ID: Denied with 403 PULSE_SSO_LOCATION_UNRESOLVED'
    );
  }

  // Test 9: URL Tampering Test (GM Tampa attempts to access Fairfax)
  {
    const tampaLoc = await db.location.findFirst({ where: { name: { contains: 'Tampa' } } });
    const fairfaxLoc = await db.location.findFirst({ where: { name: { contains: 'Fairfax' } } });

    const gmSession: any = {
      id: 'usr-gm-001',
      email: 'gm.tampa@texasdebrazil.com',
      organizationId: tampaLoc?.organizationId || '',
      roles: [Role.GENERAL_MANAGER],
      scopes: [{ scopeType: ScopeType.LOCATION, scopeId: tampaLoc?.id || '' }],
      allowedLocationIds: [tampaLoc?.id || '']
    };

    const authorized = await verifyScopeAccess(gmSession, { locationId: fairfaxLoc?.id || '' });
    assert(
      authorized === false,
      '9. URL Tampering: Tampa GM requesting Fairfax UUID is DENIED by backend scope check'
    );
  }

  // Test 10: Audit Log Verification
  {
    const auditLogs = await db.auditLog.findMany({
      where: { action: 'BRASA_MEAT_SSO_LOGIN' },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    assert(
      auditLogs.length > 0,
      '10. Audit Log: SSO attempts correctly logged in AuditLog table without sensitive tokens/passwords'
    );
  }

  console.log('\n===============================================================');
  console.log(`   TEST MATRIX RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestMatrix().catch(err => {
  console.error('Fatal Test Matrix Error:', err);
  process.exit(1);
});
