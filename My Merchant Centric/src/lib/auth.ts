import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { db } from './db';
import { Role, ScopeType } from '@prisma/client';

const JWT_SECRET = 'brasa-super-secret-key-pulse-9817';
const COOKIE_NAME = 'brasa_session';

export interface UserScopeData {
  scopeType: ScopeType;
  scopeId: string;
}

export interface SessionUser {
  id: string;
  email: string;
  organizationId: string;
  roles: Role[];
  scopes: UserScopeData[];
  authSource?: string;
  allowedLocationIds?: string[];
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// standard base64url helpers for JWT compliance
function base64url(str: string): string {
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

// Edge-safe HMAC-SHA256 signer using Web Crypto API
async function signToken(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  const signatureB64 = base64url(String.fromCharCode.apply(null, Array.from(new Uint8Array(signature))));
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

// Edge-safe HMAC-SHA256 verifier using Web Crypto API
async function verifyToken(token: string, secret: string): Promise<any | null> {
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
    
    const signatureStr = base64urlDecode(signature);
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
    
    return JSON.parse(base64urlDecode(part2));
  } catch (err) {
    console.error('verifyToken error:', err);
    return null;
  }
}

/**
 * Signs a session JWT and sets it in the cookies.
 */
export async function createSession(user: { id: string; email: string; organizationId: string; roles: Role[]; scopes: UserScopeData[]; authSource?: string; allowedLocationIds?: string[] }, response: NextResponse) {
  const payload = {
    id: user.id,
    email: user.email,
    organizationId: user.organizationId,
    roles: user.roles,
    scopes: user.scopes,
    authSource: user.authSource || 'DIRECT_PULSE_LOGIN',
    allowedLocationIds: user.allowedLocationIds || [],
  };
  
  const token = await signToken(payload, JWT_SECRET);
  
  const isProd = process.env.NODE_ENV === 'production';

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return token;
}

/**
 * Retrieves the session user from cookies.
 */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const cookie = req.cookies.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  try {
    const payload = await verifyToken(cookie.value, JWT_SECRET) as SessionUser;
    return payload;
  } catch (error) {
    console.error('JWT Verification Error in getSessionUser:', error);
    return null;
  }
}

/**
 * Checks if a session user is authorized to access a specific organization scope.
 */
export function isAuthorizedForOrganization(
  session: SessionUser,
  requestedOrgId?: string | null
): boolean {
  if (!requestedOrgId || requestedOrgId === session.organizationId) {
    return true;
  }

  const isCorporateAdmin =
    session.roles.includes(Role.CORPORATE_ADMIN) ||
    session.scopes.some(s => s.scopeId === '*');

  if (isCorporateAdmin && session.authSource !== 'BRASA_MEAT_SSO_TENANT_LOCKED') {
    return true;
  }

  return false;
}

/**
 * Resolves effective organizationId for a session.
 * Throws SCOPE_ACCESS_DENIED if requestedOrgId is unauthorized.
 */
export async function getEffectiveOrganizationId(
  session: SessionUser,
  requestedOrgId?: string | null
): Promise<string> {
  if (requestedOrgId && requestedOrgId !== session.organizationId) {
    const isAuthorized = isAuthorizedForOrganization(session, requestedOrgId);
    if (!isAuthorized) {
      throw new Error('SCOPE_ACCESS_DENIED');
    }

    const validOrg = await db.organization.findUnique({
      where: { id: requestedOrgId },
      select: { id: true }
    });
    if (validOrg) return validOrg.id;
    throw new Error('ORGANIZATION_NOT_FOUND');
  }

  return session.organizationId;
}

/**
 * Clears the session cookie.
 */
export function clearSession(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
}

/**
 * Enforces tenant isolation: throws an error if session organizationId does not match resource organizationId.
 */
export function enforceTenantIsolation(session: SessionUser, resourceOrgId: string) {
  if (session.organizationId !== resourceOrgId) {
    throw new Error('Unauthorized: Tenant isolation breach detected.');
  }
}

/**
 * Validates scope authorization for locations, regions, districts, etc.
 * Returns true if the user's scopes permit accessing the specified resource.
 */
export async function verifyScopeAccess(
  session: SessionUser,
  target: {
    locationId?: string;
    districtId?: string;
    regionId?: string;
    divisionId?: string;
  }
): Promise<boolean> {
  // 1. Enforce that target resource belongs to user's organization first
  if (target.locationId) {
    if (session.allowedLocationIds && session.allowedLocationIds.length > 0 && !session.allowedLocationIds.includes('*')) {
      if (!session.allowedLocationIds.includes(target.locationId)) {
        console.warn(`[SCOPE DENIED] User ${session.email} attempted to access unauthorized location ${target.locationId}`);
        return false;
      }
    }
    const loc = await db.location.findUnique({
      where: { id: target.locationId },
      select: { organizationId: true },
    });
    if (!loc || (loc.organizationId !== session.organizationId && !session.roles.includes(Role.CORPORATE_ADMIN))) {
      return false;
    }
  }

  if (target.districtId) {
    const dist = await db.district.findUnique({
      where: { id: target.districtId },
      select: { organizationId: true },
    });
    if (!dist || (dist.organizationId !== session.organizationId && !session.roles.includes(Role.CORPORATE_ADMIN))) {
      return false;
    }
  }

  if (target.regionId) {
    const reg = await db.region.findUnique({
      where: { id: target.regionId },
      select: { organizationId: true },
    });
    if (!reg || (reg.organizationId !== session.organizationId && !session.roles.includes(Role.CORPORATE_ADMIN))) {
      return false;
    }
  }

  if (target.divisionId) {
    const div = await db.division.findUnique({
      where: { id: target.divisionId },
      select: { organizationId: true },
    });
    if (!div || (div.organizationId !== session.organizationId && !session.roles.includes(Role.CORPORATE_ADMIN))) {
      return false;
    }
  }

  // 2. Corporate Admin and Executive roles are granted global access for their organization.
  if (session.roles.includes(Role.CORPORATE_ADMIN) || session.roles.includes(Role.EXECUTIVE)) {
    return true;
  }

  // Iterate over scopes to check permissions.
  for (const scope of session.scopes) {
    if (scope.scopeType === ScopeType.GLOBAL || scope.scopeId === '*') {
      return true;
    }

    // GENERAL_MANAGER or scope checks on locations
    if (scope.scopeType === ScopeType.LOCATION && target.locationId === scope.scopeId) {
      return true;
    }

    // DISTRICT scope check
    if (scope.scopeType === ScopeType.DISTRICT) {
      if (target.districtId === scope.scopeId) return true;
      if (target.locationId) {
        const loc = await db.location.findUnique({
          where: { id: target.locationId },
          select: { districtId: true },
        });
        if (loc?.districtId === scope.scopeId) return true;
      }
    }

    // REGION scope check
    if (scope.scopeType === ScopeType.REGION) {
      if (target.regionId === scope.scopeId) return true;
      if (target.locationId) {
        const loc = await db.location.findUnique({
          where: { id: target.locationId },
          select: { regionId: true },
        });
        if (loc?.regionId === scope.scopeId) return true;
      }
      if (target.districtId) {
        const dist = await db.district.findUnique({
          where: { id: target.districtId },
          select: { regionId: true },
        });
        if (dist?.regionId === scope.scopeId) return true;
      }
    }

    // DIVISION scope check
    if (scope.scopeType === ScopeType.DIVISION) {
      if (target.divisionId === scope.scopeId) return true;
      if (target.locationId) {
        const loc = await db.location.findUnique({
          where: { id: target.locationId },
          select: { divisionId: true },
        });
        if (loc?.divisionId === scope.scopeId) return true;
      }
      if (target.regionId) {
        const reg = await db.region.findUnique({
          where: { id: target.regionId },
          select: { divisionId: true },
        });
        if (reg?.divisionId === scope.scopeId) return true;
      }
    }
  }

  return false;
}

/**
 * Enforces scope check: throws if unauthorized.
 */
export async function enforceScopeAccess(
  session: SessionUser,
  target: {
    locationId?: string;
    districtId?: string;
    regionId?: string;
    divisionId?: string;
  }
) {
  const allowed = await verifyScopeAccess(session, target);
  if (!allowed) {
    throw new Error('Unauthorized: User scope does not permit accessing this resource.');
  }
}

/**
 * Server Component Session Fetcher.
 * Retrieves session user directly from server cookies.
 */
export async function getServerSession(cookieStore: any): Promise<SessionUser | null> {
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return await verifyToken(token, JWT_SECRET) as SessionUser;
  } catch (error) {
    return null;
  }
}
