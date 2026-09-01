import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { GoogleBusinessProfileConnector } from '../../../../../lib/connectors/google';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mockMode = searchParams.get('mock') === 'true';
  const orgId = searchParams.get('organizationId');

  if (!orgId) {
    return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const cookieStore = cookies();
  
  // Store OAuth state cookie
  cookieStore.set('google_oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600
  });

  // Store temporary organization ID mapping
  cookieStore.set('google_oauth_org_id', orgId, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600
  });

  const connector = new GoogleBusinessProfileConnector(orgId);
  const creds = await connector.getCredentials();

  if (mockMode) {
    // Persist Mock Mode state in the integration
    await connector.saveCredentials({ mockMode: true });
    
    // Redirect to local mock callback
    const callbackUrl = new URL('/api/integrations/google/callback', request.url);
    callbackUrl.searchParams.set('code', 'mock-auth-code-12345');
    callbackUrl.searchParams.set('state', state);
    return NextResponse.redirect(callbackUrl.toString());
  }

  // Live mode: explicitly switch mode to live
  await connector.saveCredentials({ mockMode: false });

  // Real Google OAuth redirect url
  const authUrl = connector.oauthClient.getAuthorizeUrl(state);
  return NextResponse.redirect(authUrl);
}
