import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleBusinessProfileConnector } from '../../../../../lib/connectors/google';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = cookies();
  const savedState = cookieStore.get('google_oauth_state')?.value;
  const orgId = cookieStore.get('google_oauth_org_id')?.value;

  if (!orgId) {
    return NextResponse.json({ error: 'Missing organization context session' }, { status: 400 });
  }

  if (!state || state !== savedState) {
    return NextResponse.json({ error: 'OAuth CSRF state validation failed' }, { status: 400 });
  }

  const connector = new GoogleBusinessProfileConnector(orgId);
  const creds = await connector.getCredentials();

  try {
    if (creds.mockMode) {
      // Mock callback exchange
      await connector.saveCredentials({
        mockMode: true,
        accessToken: 'mock-access-token-12345',
        refreshToken: 'mock-refresh-token-12345',
        expiresAt: Date.now() + 3600 * 1000
      });
    } else {
      if (!code) {
        return NextResponse.json({ error: 'Missing auth code' }, { status: 400 });
      }
      // Real exchange
      const tokens = await connector.oauthClient.exchangeCode(code);
      await connector.saveCredentials({
        mockMode: false,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000
      });
    }

    // Clean up temporary session state cookies
    cookieStore.delete('google_oauth_state');
    cookieStore.delete('google_oauth_org_id');

    // Redirect to the Admin Integrations dashboard page
    const redirectUrl = new URL('/admin/integrations', request.url);
    redirectUrl.searchParams.set('success', 'true');
    return NextResponse.redirect(redirectUrl.toString());
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'OAuth code exchange failed' }, { status: 500 });
  }
}
