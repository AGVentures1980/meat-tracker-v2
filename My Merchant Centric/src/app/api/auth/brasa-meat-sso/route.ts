import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession, SessionUser } from '@/lib/auth';
import { Role, ScopeType } from '@prisma/client';
import crypto from 'crypto';

// Edge-safe HMAC-SHA256 verifier for SSO JWT tokens
async function verifyJwtToken(token: string, secret: string): Promise<any | null> {
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

    // base64url decode helper
    let base64 = signature.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const signatureStr = atob(base64);
    const signatureBytes = new Uint8Array(
      signatureStr.split('').map((c) => c.charCodeAt(0))
    );
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBytes,
      data
    );
    
    if (!isValid) return null;
    
    let payloadStr = part2.replace(/-/g, '+').replace(/_/g, '/');
    while (payloadStr.length % 4) {
      payloadStr += '=';
    }
    return JSON.parse(atob(payloadStr));
  } catch (err) {
    console.error('verifyJwtToken error:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    let token: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      try {
        const body = await req.json();
        token = body.token || body.jwt;
      } catch (e) {
        // Not a JSON body
      }
    }

    if (!token) {
      const url = new URL(req.url);
      token = url.searchParams.get('token');
    }

    if (!token) {
      return NextResponse.json({
        error: 'PULSE_SSO_MISSING_TOKEN',
        message: 'No SSO handoff token provided in Authorization header, body, or query params.'
      }, { status: 400 });
    }

    // 1. TOKEN VERIFICATION & EXPIRY CHECK
    const secret = process.env.PULSE_SSO_SECRET || 'pulse-sso-secret-dev';
    const payload = await verifyJwtToken(token, secret);

    if (!payload) {
      return NextResponse.json({
        error: 'PULSE_SSO_INVALID_SIGNATURE',
        message: 'The handoff token signature is invalid or tampered with.'
      }, { status: 401 });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSec) {
      return NextResponse.json({
        error: 'PULSE_SSO_TOKEN_EXPIRED',
        message: 'The handoff token has expired.'
      }, { status: 401 });
    }

    // 2. AUDIENCE & ISSUER VERIFICATION
    if (payload.aud !== 'brasa-brand-pulse') {
      return NextResponse.json({
        error: 'PULSE_SSO_INVALID_AUDIENCE',
        message: `Invalid token audience: ${payload.aud}`
      }, { status: 401 });
    }

    if (payload.iss !== 'brasa-meat-intelligence') {
      return NextResponse.json({
        error: 'PULSE_SSO_INVALID_ISSUER',
        message: `Invalid token issuer: ${payload.iss}`
      }, { status: 401 });
    }

    // 3. REPLAY PREVENTION (PERSISTENT SINGLE-USE JTI)
    const jtiStr = payload.jti || `jti_${payload.userId}_${payload.iat}`;
    const issuerStr = payload.iss || 'brasa-meat-intelligence';

    const consumed = await db.consumedSsoHandoff.findUnique({
      where: { issuer_jti: { issuer: issuerStr, jti: jtiStr } }
    });

    if (consumed) {
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
              issuer: issuerStr,
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

    // Extract claims
    const {
      userId: meatUserId,
      organizationId: meatOrgId,
      allowedLocationIds: rawAllowedLocIds,
      activeLocationId: rawActiveLocId,
      primaryLocationId: rawPrimaryLocId,
      scopeType: rawScopeType,
      role: meatRole,
      isMaster: rawIsMaster,
      master: rawMaster,
      globalScope: rawGlobalScope,
      email
    } = payload;

    const isMasterUser = Boolean(
      rawIsMaster ||
      rawMaster ||
      rawGlobalScope ||
      payload.scope === 'GLOBAL' ||
      String(meatRole).toUpperCase() === 'MASTER'
    );

    const meatLocationIds = Array.isArray(rawAllowedLocIds) ? rawAllowedLocIds.map(String) : [];

    if (!meatUserId || (!isMasterUser && meatLocationIds.length === 0)) {
      return NextResponse.json({
        error: 'PULSE_SSO_INVALID_TOKEN',
        message: 'Required claims (userId, allowedLocationIds) are missing.'
      }, { status: 400 });
    }

    // 4. MASTER ORGANIZATION IDENTITY RESOLUTION
    let pulseOrganizationId: string | null = null;

    const orgIdStr = String(meatOrgId).toLowerCase();

    // Map legacy/subdomain strings to canonical Brand Pulse org
    let targetBrasaOrgId = String(meatOrgId);
    if (orgIdStr === '26e29999-5e6e-4022-bd85-17aec722655e' || orgIdStr === 'terra') {
      targetBrasaOrgId = '9e371bc2-594f-46a3-8c95-8fc91a13041f';
    } else if (orgIdStr === 'ea32ec07-c64b-4670-88ec-849cabd7170f' || orgIdStr === 'hardrock') {
      targetBrasaOrgId = '3a6ac28e-6b5e-4a60-8ad6-5bc18a4b5037';
    } else if (orgIdStr === 'd04d5015-44a9-4bdd-9021-b8bd28caad9b' || orgIdStr === 'outback') {
      targetBrasaOrgId = '66c8dc51-e1ed-48dd-8c03-57603796d22f';
    } else if (orgIdStr === 'tdb' || orgIdStr === 'texas') {
      targetBrasaOrgId = 'tdb-main';
    } else if (orgIdStr === 'fogo') {
      targetBrasaOrgId = '43670635-c205-4b19-99d4-445c7a683730';
    }

    let canonicalOrg = await db.organization.findFirst({
      where: {
        OR: [
          { brasaOrganizationId: targetBrasaOrgId },
          { brasaOrganizationId: String(meatOrgId) },
          { id: String(meatOrgId) }
        ]
      }
    });

    // Fallback: If not matched by exact brasaOrganizationId, match by client brand name
    if (!canonicalOrg) {
      let nameSearch: string | null = null;
      if (orgIdStr === '9e371bc2-594f-46a3-8c95-8fc91a13041f' || orgIdStr === '26e29999-5e6e-4022-bd85-17aec722655e' || orgIdStr.includes('terra')) {
        nameSearch = 'Terra';
      } else if (orgIdStr === '3a6ac28e-6b5e-4a60-8ad6-5bc18a4b5037' || orgIdStr === 'ea32ec07-c64b-4670-88ec-849cabd7170f' || orgIdStr.includes('hardrock')) {
        nameSearch = 'Hard Rock';
      } else if (orgIdStr === '66c8dc51-e1ed-48dd-8c03-57603796d22f' || orgIdStr === 'd04d5015-44a9-4bdd-9021-b8bd28caad9b' || orgIdStr.includes('outback')) {
        nameSearch = 'Bloomin';
      } else if (orgIdStr === 'tdb-main' || orgIdStr.includes('tdb') || orgIdStr.includes('texas')) {
        nameSearch = 'Texas';
      } else if (orgIdStr === '43670635-c205-4b19-99d4-445c7a683730' || orgIdStr.includes('fogo')) {
        nameSearch = 'Fogo';
      }

      if (nameSearch) {
        canonicalOrg = await db.organization.findFirst({
          where: { name: { contains: nameSearch, mode: 'insensitive' } }
        });

        if (canonicalOrg) {
          try {
            await db.organization.update({
              where: { id: canonicalOrg.id },
              data: { brasaOrganizationId: targetBrasaOrgId }
            });
          } catch (e) {
            // Ignore if concurrent update or unique constraint
          }
        }
      }
    }

    // JIT Auto-Provisioning for Authoritative Meat Signed Handoffs
    if (!canonicalOrg) {
      let provName = 'Client Organization';
      let provSlug = 'client-org';

      if (orgIdStr === '9e371bc2-594f-46a3-8c95-8fc91a13041f' || orgIdStr === '26e29999-5e6e-4022-bd85-17aec722655e' || orgIdStr.includes('terra')) {
        provName = 'Terra Gaúcha Brazilian Steakhouse';
        provSlug = 'terra-gaucha';
      } else if (orgIdStr === '3a6ac28e-6b5e-4a60-8ad6-5bc18a4b5037' || orgIdStr === 'ea32ec07-c64b-4670-88ec-849cabd7170f' || orgIdStr.includes('hardrock')) {
        provName = 'Hard Rock Hotel & Casino';
        provSlug = 'hard-rock';
      } else if (orgIdStr === '66c8dc51-e1ed-48dd-8c03-57603796d22f' || orgIdStr === 'd04d5015-44a9-4bdd-9021-b8bd28caad9b' || orgIdStr.includes('outback')) {
        provName = "Bloomin' Brands / Outback";
        provSlug = 'outback-steakhouse';
      } else if (orgIdStr === 'tdb-main' || orgIdStr.includes('tdb') || orgIdStr.includes('texas')) {
        provName = 'Texas de Brazil';
        provSlug = 'texas-de-brazil';
      } else if (orgIdStr === '43670635-c205-4b19-99d4-445c7a683730' || orgIdStr.includes('fogo')) {
        provName = 'Fogo de Chão';
        provSlug = 'fogo-de-chao';
      }

      try {
        canonicalOrg = await db.organization.create({
          data: {
            brasaOrganizationId: targetBrasaOrgId,
            name: provName,
            slug: provSlug + '-' + Date.now().toString(36),
            status: 'ACTIVE'
          }
        });
        console.log(`[JIT PROVISIONING] Created Organization ${canonicalOrg.id} for Meat org ${targetBrasaOrgId}`);
      } catch (e: any) {
        console.error('[JIT PROVISIONING FAIL]', e.message);
      }
    }

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

    // 5. ACTIVE LOCATION SCOPE & WRONG-TENANT VALIDATION
    const requestedActiveMeatLocId = rawActiveLocId || rawPrimaryLocId || null;

    if (requestedActiveMeatLocId && !isMasterUser) {
      const reqActiveStr = String(requestedActiveMeatLocId);
      if (!meatLocationIds.includes(reqActiveStr)) {
        return NextResponse.json({
          error: 'PULSE_SSO_ACTIVE_LOCATION_SCOPE_MISMATCH',
          message: `Active location ${reqActiveStr} is not present in user's allowed location scope.`
        }, { status: 403 });
      }
    }

    // 6. MASTER LOCATION IDENTITY RESOLUTION
    const resolvedPulseLocationIds: string[] = [];
    const resolvedBrasaLocationIds: string[] = [];
    let activePulseLocationId: string | null = null;

    for (const storeIdStr of meatLocationIds) {
      const canonicalLoc = await db.location.findFirst({
        where: {
          organizationId: pulseOrganizationId,
          OR: [
            { brasaLocationId: storeIdStr },
            { brasaLocationId: `fogo_${storeIdStr}` },
            { id: storeIdStr }
          ]
        }
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
          const mappedLoc = await db.location.findUnique({ where: { id: locMap.pulseLocationId } });
          if (mappedLoc && mappedLoc.organizationId === pulseOrganizationId) {
            if (!resolvedPulseLocationIds.includes(mappedLoc.id)) {
              resolvedPulseLocationIds.push(mappedLoc.id);
              resolvedBrasaLocationIds.push(storeIdStr);
            }
          }
        }
      }
    }

    // Fallback: If no location was explicitly matched for authorized org, populate all org locations
    if (resolvedPulseLocationIds.length === 0) {
      const allOrgLocs = await db.location.findMany({
        where: { organizationId: pulseOrganizationId, status: 'ACTIVE' },
        select: { id: true, brasaLocationId: true }
      });
      for (const loc of allOrgLocs) {
        resolvedPulseLocationIds.push(loc.id);
        if (loc.brasaLocationId) resolvedBrasaLocationIds.push(loc.brasaLocationId);
      }
    }

    if (!isMasterUser && resolvedPulseLocationIds.length === 0) {
      console.warn(`[SSO DENIED] Zero locations resolved for Meat store IDs:`, meatLocationIds);
      return NextResponse.json({
        error: 'PULSE_SSO_LOCATION_UNRESOLVED',
        message: 'None of the authorized Meat store IDs could be resolved to a canonical Brand Pulse location.'
      }, { status: 403 });
    }

    // Resolve specific active location
    if (requestedActiveMeatLocId) {
      const activeStr = String(requestedActiveMeatLocId);
      const targetLoc = await db.location.findFirst({
        where: {
          organizationId: pulseOrganizationId,
          OR: [
            { brasaLocationId: activeStr },
            { brasaLocationId: `fogo_${activeStr}` },
            { id: activeStr }
          ]
        }
      });

      if (targetLoc) {
        activePulseLocationId = targetLoc.id;
      } else {
        const targetLocMap = await db.externalLocationIdentity.findUnique({
          where: { provider_externalLocationId: { provider: 'BRASA_MEAT', externalLocationId: activeStr } }
        });

        if (targetLocMap) {
          const mappedLoc = await db.location.findUnique({ where: { id: targetLocMap.pulseLocationId } });
          if (mappedLoc && mappedLoc.organizationId === pulseOrganizationId) {
            activePulseLocationId = mappedLoc.id;
          }
        }
      }

      if (!activePulseLocationId) {
        activePulseLocationId = resolvedPulseLocationIds[0] || null;
      }
    } else {
      activePulseLocationId = resolvedPulseLocationIds[0] || null;
    }

    // 7. USER IDENTITY LINKING & JIT PROVISIONING
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

    // 8. ATOMIC SINGLE-USE JTI CONSUMPTION (REPLAY PREVENTION)
    try {
      await db.consumedSsoHandoff.create({
        data: {
          issuer: issuerStr,
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
                issuer: issuerStr,
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

    // 9. ROLE NORMALIZATION & SCOPE CONSTRUCTION
    let pulseRole: Role = Role.GENERAL_MANAGER;
    const normalizedRoleStr = String(meatRole || '').toLowerCase();

    if (isMasterUser || ['admin', 'director', 'corporate_director', 'corporate_admin', 'master'].includes(normalizedRoleStr)) {
      pulseRole = Role.CORPORATE_ADMIN;
    } else if (['area_manager', 'regional_director'].includes(normalizedRoleStr)) {
      pulseRole = Role.AREA_MANAGER;
    } else {
      pulseRole = Role.GENERAL_MANAGER;
    }

    const userScopes = isMasterUser
      ? [{ scopeType: ScopeType.GLOBAL, scopeId: '*' }]
      : resolvedPulseLocationIds.map(locId => ({
          scopeType: ScopeType.LOCATION,
          scopeId: locId
        }));

    // 10. AUDIT LOGGING
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
          isMaster: isMasterUser,
          resolvedPulseRole: pulseRole,
          resolvedLocationCount: resolvedPulseLocationIds.length,
          primaryLocationId: activePulseLocationId,
          timestamp: new Date().toISOString(),
          outcome: 'SUCCESS'
        }
      }
    });

    // 11. REDIRECT TARGET & SESSION CREATION
    const isNetworkScope = rawScopeType === 'NETWORK' || (!requestedActiveMeatLocId && resolvedPulseLocationIds.length > 1);

    const redirectPath = (activePulseLocationId && !isNetworkScope)
      ? `/dashboard?organizationId=${pulseOrganizationId}&locationId=${activePulseLocationId}`
      : `/dashboard?organizationId=${pulseOrganizationId}`;

    const acceptHeader = req.headers.get('accept') || '';
    const isJsonRequest = acceptHeader.includes('application/json') && !acceptHeader.includes('text/html');

    let res: NextResponse;

    if (isJsonRequest) {
      res = NextResponse.json({
        success: true,
        redirectUrl: redirectPath,
        user: {
          id: pulseUserId,
          email: email || `sso_${meatUserId}@brasameat.com`,
          organizationId: pulseOrganizationId,
          role: pulseRole,
          isMaster: isMasterUser,
          primaryLocationId: activePulseLocationId,
          allowedLocationIds: resolvedPulseLocationIds,
          brasaOrganizationId: String(meatOrgId),
          brasaLocationIds: resolvedBrasaLocationIds
        }
      });
    } else {
      const redirectUrl = new URL(redirectPath, req.url);
      res = NextResponse.redirect(redirectUrl);
    }

    await createSession({
      id: pulseUserId,
      email: email || `sso_${meatUserId}@brasameat.com`,
      organizationId: pulseOrganizationId,
      roles: [pulseRole],
      scopes: userScopes,
      allowedLocationIds: isMasterUser ? ['*'] : resolvedPulseLocationIds,
      authSource: isMasterUser ? 'DIRECT_PULSE_LOGIN' : 'BRASA_MEAT_SSO'
    }, res);

    return res;
  } catch (err: any) {
    console.error('SSO handoff handler error:', err);
    return NextResponse.json({ error: err?.message || 'Error executing SSO handoff' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
