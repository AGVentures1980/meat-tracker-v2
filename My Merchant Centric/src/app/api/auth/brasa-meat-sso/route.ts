import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { createSession } from '../../../../lib/auth';
import { Role, ScopeType } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Edge-safe base64url decode helper
function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

// HMAC-SHA256 verifier using Web Crypto API
async function verifyHandoffJwt(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [part1, part2, signature] = parts;
    const encoder = new TextEncoder();
    const data = encoder.encode(`${part1}.${part2}`);

    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    let signatureStr = signature.replace(/-/g, '+').replace(/_/g, '/');
    while (signatureStr.length % 4) {
      signatureStr += '=';
    }
    const signatureBytes = new Uint8Array(
      Buffer.from(signatureStr, 'base64')
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBytes,
      data
    );

    if (!isValid) return null;

    return JSON.parse(base64urlDecode(part2));
  } catch (err) {
    console.error('[SSO Token Verify Error]:', err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  return handleSSO(req);
}

export async function POST(req: NextRequest) {
  return handleSSO(req);
}

async function handleSSO(req: NextRequest) {
  try {
    // 1. DEDICATED SSO SECRET CHECK
    const secret = process.env.PULSE_SSO_SECRET;
    if (!secret || secret.trim().length === 0) {
      console.error('[SSO FAIL] PULSE_SSO_SECRET is not configured on Brand Pulse.');
      return NextResponse.json({
        error: 'PULSE_SSO_NOT_CONFIGURED',
        message: 'Dedicated SSO secret PULSE_SSO_SECRET is not configured on receiver.'
      }, { status: 500 });
    }

    // Extract token from query params or request body
    let token: string | null = req.nextUrl.searchParams.get('token');
    if (!token && req.method === 'POST') {
      try {
        const body = await req.json();
        token = body.token || null;
      } catch (e) {
        token = null;
      }
    }

    if (!token) {
      return NextResponse.json({
        error: 'PULSE_SSO_INVALID_TOKEN',
        message: 'No handoff token provided.'
      }, { status: 400 });
    }

    // 2. CRYPTOGRAPHIC VERIFICATION & CLAIMS VALIDATION
    const payload = await verifyHandoffJwt(token, secret);
    if (!payload) {
      return NextResponse.json({
        error: 'PULSE_SSO_INVALID_TOKEN',
        message: 'Invalid signature or malformed token payload.'
      }, { status: 401 });
    }

    // Issuer check
    if (payload.iss !== 'brasa-meat-intelligence') {
      return NextResponse.json({
        error: 'PULSE_SSO_INVALID_TOKEN',
        message: `Invalid issuer: ${payload.iss}. Expected brasa-meat-intelligence.`
      }, { status: 401 });
    }

    // Audience check
    if (payload.aud !== 'brasa-brand-pulse') {
      return NextResponse.json({
        error: 'PULSE_SSO_INVALID_TOKEN',
        message: `Invalid audience: ${payload.aud}. Expected brasa-brand-pulse.`
      }, { status: 401 });
    }

    // Expiration check
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) {
      return NextResponse.json({
        error: 'PULSE_SSO_EXPIRED',
        message: 'Handoff token has expired.'
      }, { status: 401 });
    }

    // 3. JTI PRESENCE CHECK (FAIL CLOSED)
    const jtiStr = payload.jti ? String(payload.jti).trim() : '';
    if (!jtiStr) {
      return NextResponse.json({
        error: 'PULSE_SSO_JTI_REQUIRED',
        message: 'Handoff JWT must contain a unique non-empty jti claim for replay protection.'
      }, { status: 401 });
    }

    // 4. ATOMIC SINGLE-USE JTI CONSUMPTION (REPLAY PREVENTION)
    try {
      await db.consumedSsoHandoff.create({
        data: {
          issuer: payload.iss || 'brasa-meat-intelligence',
          jti: jtiStr,
          externalUserId: payload.userId ? String(payload.userId) : null,
          issuedAt: payload.iat ? new Date(payload.iat * 1000) : null,
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
          outcome: 'SUCCESS'
        }
      });
    } catch (err: any) {
      if (err?.code === 'P2002' || err?.message?.includes('Unique constraint') || err?.message?.includes('unique constraint')) {
        const sysOrg = await db.organization.findFirst();
        if (sysOrg) {
          await db.auditLog.create({
            data: {
              organizationId: sysOrg.id,
              userId: null,
              action: 'PULSE_SSO_REPLAY_BLOCKED',
              entityType: 'SSO_HANDOFF',
              entityId: jtiStr,
              metadata: {
                issuer: payload.iss,
                jti: jtiStr,
                externalUserId: String(payload.userId || ''),
                outcome: 'REPLAY_BLOCKED'
              }
            }
          }).catch(() => {});
        }

        return NextResponse.json({
          error: 'PULSE_SSO_REPLAY_DETECTED',
          message: 'This handoff token has already been consumed. Replay attempt blocked.'
        }, { status: 401 });
      }
      throw err;
    }


    const { userId: meatUserId, organizationId: meatOrgId, allowedLocationIds: meatLocationIds, primaryLocationId: meatPrimaryLocId, role: meatRole, email } = payload;

    if (!meatUserId || !meatLocationIds || !Array.isArray(meatLocationIds)) {
      return NextResponse.json({
        error: 'PULSE_SSO_INVALID_TOKEN',
        message: 'Required claims (userId, allowedLocationIds) are missing.'
      }, { status: 400 });
    }

    // 4. MASTER ORGANIZATION IDENTITY RESOLUTION
    let pulseOrganizationId: string | null = null;

    const canonicalOrg = await db.organization.findFirst({
      where: { brasaOrganizationId: String(meatOrgId) }
    });

    if (canonicalOrg) {
      pulseOrganizationId = canonicalOrg.id;
    } else {
      const orgMap = await db.externalOrganizationIdentity.findUnique({
        where: { provider_externalOrgId: { provider: 'BRASA_MEAT', externalOrgId: String(meatOrgId) } }
      });

      if (orgMap) {
        pulseOrganizationId = orgMap.pulseOrganizationId;
      }
    }

    if (!pulseOrganizationId) {
      return NextResponse.json({
        error: 'PULSE_SSO_ORGANIZATION_UNRESOLVED',
        message: `Could not resolve Meat organizationId ${meatOrgId} to a Pulse Organization.`
      }, { status: 403 });
    }

    // 5. MASTER LOCATION IDENTITY RESOLUTION
    const resolvedPulseLocationIds: string[] = [];
    const resolvedBrasaLocationIds: string[] = [];
    let primaryPulseLocationId: string | null = null;

    for (const meatStoreId of meatLocationIds) {
      const storeIdStr = String(meatStoreId);

      const canonicalLoc = await db.location.findFirst({
        where: { brasaLocationId: storeIdStr, organizationId: pulseOrganizationId }
      });

      if (canonicalLoc) {
        if (!resolvedPulseLocationIds.includes(canonicalLoc.id)) {
          resolvedPulseLocationIds.push(canonicalLoc.id);
          resolvedBrasaLocationIds.push(storeIdStr);
        }
      } else {
        const locMap = await db.externalLocationIdentity.findUnique({
          where: { provider_externalLocationId: { provider: 'BRASA_MEAT', externalLocationId: storeIdStr } }
        });

        if (locMap && locMap.active) {
          if (!resolvedPulseLocationIds.includes(locMap.pulseLocationId)) {
            resolvedPulseLocationIds.push(locMap.pulseLocationId);
            resolvedBrasaLocationIds.push(storeIdStr);
          }
        }
      }
    }

    if (resolvedPulseLocationIds.length === 0) {
      console.warn(`[SSO DENIED] Zero locations resolved for Meat store IDs:`, meatLocationIds);
      return NextResponse.json({
        error: 'PULSE_SSO_LOCATION_UNRESOLVED',
        message: 'None of the authorized Meat store IDs could be resolved to a canonical Brand Pulse location.'
      }, { status: 403 });
    }

    // Resolve primary location
    if (meatPrimaryLocId) {
      const primaryLoc = await db.location.findFirst({
        where: { brasaLocationId: String(meatPrimaryLocId), organizationId: pulseOrganizationId }
      });
      if (primaryLoc && resolvedPulseLocationIds.includes(primaryLoc.id)) {
        primaryPulseLocationId = primaryLoc.id;
      } else {
        const primaryLocMap = await db.externalLocationIdentity.findUnique({
          where: { provider_externalLocationId: { provider: 'BRASA_MEAT', externalLocationId: String(meatPrimaryLocId) } }
        });
        if (primaryLocMap && resolvedPulseLocationIds.includes(primaryLocMap.pulseLocationId)) {
          primaryPulseLocationId = primaryLocMap.pulseLocationId;
        }
      }
    }
    if (!primaryPulseLocationId) {
      primaryPulseLocationId = resolvedPulseLocationIds[0];
    }

    // 6. USER IDENTITY LINKING & JIT PROVISIONING
    let pulseUserId: string | null = null;
    const userMapping = await db.externalUserIdentity.findUnique({
      where: { provider_externalUserId: { provider: 'BRASA_MEAT', externalUserId: String(meatUserId) } }
    });

    if (userMapping) {
      pulseUserId = userMapping.pulseUserId;
    } else {
      const existingUser = await db.user.findFirst({
        where: { email: email, organizationId: pulseOrganizationId }
      });

      if (existingUser) {
        pulseUserId = existingUser.id;
        await db.externalUserIdentity.create({
          data: {
            provider: 'BRASA_MEAT',
            externalUserId: String(meatUserId),
            pulseUserId: existingUser.id,
            organizationId: pulseOrganizationId
          }
        }).catch(err => console.warn('Identity link notice:', err.message));
      } else {
        const randomHash = await bcrypt.hash(`jit_sso_${Date.now()}_${Math.random()}`, 10);
        const newUser = await db.user.create({
          data: {
            organizationId: pulseOrganizationId,
            firstName: email ? email.split('@')[0] : 'SSO',
            lastName: 'User',
            email: email || `sso_${meatUserId}@brasameat.com`,
            passwordHash: randomHash,
            status: 'ACTIVE'
          }
        });
        pulseUserId = newUser.id;

        await db.externalUserIdentity.create({
          data: {
            provider: 'BRASA_MEAT',
            externalUserId: String(meatUserId),
            pulseUserId: newUser.id,
            organizationId: pulseOrganizationId
          }
        });
      }
    }

    // 7. ATOMIC SINGLE-USE JTI CONSUMPTION (REPLAY PREVENTION)
    try {
      await db.consumedSsoHandoff.create({
        data: {
          issuer: payload.iss || 'brasa-meat-intelligence',
          jti: jtiStr,
          externalUserId: payload.userId ? String(payload.userId) : null,
          issuedAt: payload.iat ? new Date(payload.iat * 1000) : null,
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
          outcome: 'SUCCESS'
        }
      });
    } catch (err: any) {
      if (err?.code === 'P2002' || err?.message?.includes('Unique constraint') || err?.message?.includes('unique constraint')) {
        const sysOrg = await db.organization.findFirst();
        if (sysOrg) {
          await db.auditLog.create({
            data: {
              organizationId: sysOrg.id,
              userId: null,
              action: 'PULSE_SSO_REPLAY_BLOCKED',
              entityType: 'SSO_HANDOFF',
              entityId: jtiStr,
              metadata: {
                issuer: payload.iss,
                jti: jtiStr,
                externalUserId: String(payload.userId || ''),
                outcome: 'REPLAY_BLOCKED'
              }
            }
          }).catch(() => {});
        }

        return NextResponse.json({
          error: 'PULSE_SSO_REPLAY_DETECTED',
          message: 'This handoff token has already been consumed. Replay attempt blocked.'
        }, { status: 401 });
      }
      throw err;
    }

    // 8. ROLE NORMALIZATION & SCOPE CONSTRUCTION
    let pulseRole: Role = Role.GENERAL_MANAGER;
    const normalizedRoleStr = String(meatRole || '').toLowerCase();

    if (['admin', 'director', 'corporate_director', 'corporate_admin'].includes(normalizedRoleStr)) {
      pulseRole = Role.CORPORATE_ADMIN;
    } else if (['area_manager', 'regional_director'].includes(normalizedRoleStr)) {
      pulseRole = Role.AREA_MANAGER;
    } else {
      pulseRole = Role.GENERAL_MANAGER;
    }

    const userScopes = resolvedPulseLocationIds.map(locId => ({
      scopeType: ScopeType.LOCATION,
      scopeId: locId
    }));

    // 9. AUDIT LOGGING
    await db.auditLog.create({
      data: {
        organizationId: pulseOrganizationId,
        userId: pulseUserId,
        action: 'PULSE_SSO_HANDOFF_CONSUMED',
        entityType: 'USER',
        entityId: pulseUserId,
        metadata: {
          externalUserId: String(meatUserId),
          authSource: 'BRASA_MEAT_SSO',
          jti: jtiStr,
          meatRole: meatRole,
          resolvedPulseRole: pulseRole,
          resolvedLocationCount: resolvedPulseLocationIds.length,
          primaryLocationId: primaryPulseLocationId,
          timestamp: new Date().toISOString(),
          outcome: 'SUCCESS'
        }
      }
    });

    // 10. SESSION CREATION & POST-SSO REDIRECT (HTTP 302 FOR BROWSER GET)
    const acceptHeader = req.headers.get('accept') || '';
    const isJsonRequest = acceptHeader.includes('application/json') && !acceptHeader.includes('text/html');

    let res: NextResponse;

    if (isJsonRequest) {
      res = NextResponse.json({
        success: true,
        user: {
          id: pulseUserId,
          email: email || `sso_${meatUserId}@brasameat.com`,
          organizationId: pulseOrganizationId,
          role: pulseRole,
          primaryLocationId: primaryPulseLocationId,
          allowedLocationIds: resolvedPulseLocationIds,
          brasaOrganizationId: String(meatOrgId),
          brasaLocationIds: resolvedBrasaLocationIds
        }
      });
    } else {
      const dashboardUrl = new URL('/dashboard', req.url);
      res = NextResponse.redirect(dashboardUrl);
    }

    await createSession({
      id: pulseUserId,
      email: email || `sso_${meatUserId}@brasameat.com`,
      organizationId: pulseOrganizationId,
      roles: [pulseRole],
      scopes: pulseRole === Role.CORPORATE_ADMIN ? [{ scopeType: ScopeType.GLOBAL, scopeId: '*' }] : userScopes,
      allowedLocationIds: resolvedPulseLocationIds,
      authSource: 'BRASA_MEAT_SSO'
    }, res);

    return res;
  } catch (err: any) {
    console.error('SSO handoff handler error:', err);
    return NextResponse.json({ error: err?.message || 'Error executing SSO handoff' }, { status: 500 });
  }
}
