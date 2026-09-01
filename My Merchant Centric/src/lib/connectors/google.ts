import crypto from 'crypto';
import { db } from '../db';
import { z } from 'zod';

const ALGORITHM_GCM = 'aes-256-gcm';
const ALGORITHM_CBC = 'aes-256-cbc';
const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;

export const GoogleCredentialsSchema = z.object({
  mockMode: z.boolean(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.number().optional(),
  accountId: z.string().optional().nullable(),
  apiAccessRequired: z.boolean().optional()
});

export type GoogleCredentials = z.infer<typeof GoogleCredentialsSchema>;

export function encryptGCM(text: string, aadText: string, customKey?: string): string {
  const secretKey = customKey || process.env.OAUTH_TOKEN_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || 'brasa-secure-secret-key-32-chars';
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM_GCM, Buffer.from(secretKey), iv);
  
  cipher.setAAD(Buffer.from(aadText, 'utf8'));
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `gcm:v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptGCM(encryptedText: string, aadText: string, customKey?: string): string {
  const secretKey = customKey || process.env.OAUTH_TOKEN_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || 'brasa-secure-secret-key-32-chars';
  const parts = encryptedText.split(':');
  
  if (parts[0] !== 'gcm' || parts[1] !== 'v1') {
    throw new Error('Unsupported or malformed GCM ciphertext version format');
  }

  const iv = Buffer.from(parts[2], 'hex');
  const authTag = Buffer.from(parts[3], 'hex');
  const ciphertext = parts[4];

  const decipher = crypto.createDecipheriv(ALGORITHM_GCM, Buffer.from(secretKey), iv);
  decipher.setAAD(Buffer.from(aadText, 'utf8'));
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function decryptCBC(encryptedText: string, customKey?: string): string {
  const secretKey = customKey || process.env.ENCRYPTION_KEY || 'brasa-secure-secret-key-32-chars';
  const parts = encryptedText.split(':');
  let ivHex = '';
  let ciphertextHex = '';

  if (parts[0] === 'cbc' && parts[1] === 'v1') {
    ivHex = parts[2];
    ciphertextHex = parts[3];
  } else if (parts.length === 2) {
    ivHex = parts[0];
    ciphertextHex = parts[1];
  } else {
    throw new Error('Unsupported legacy CBC ciphertext format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM_CBC, Buffer.from(secretKey), iv);
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export function decryptCredentialString(ciphertext: string, aadText: string, customKey?: string): string {
  const allowPlaintext = process.env.ALLOW_LEGACY_PLAINTEXT_CREDENTIALS === 'true';

  if (ciphertext.trim().startsWith('{')) {
    if (!allowPlaintext) {
      throw new Error('Plaintext JSON credentials are strictly prohibited by security policy');
    }
    return ciphertext;
  }

  if (ciphertext.startsWith('gcm:v1:')) {
    return decryptGCM(ciphertext, aadText, customKey);
  }

  if (ciphertext.startsWith('cbc:v1:') || ciphertext.split(':').length === 2) {
    return decryptCBC(ciphertext, customKey);
  }

  throw new Error('Unknown or unsupported credentials encryption format');
}

export class GoogleBusinessProfileConnector {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  /**
   * Retrieves integration credentials and decrypts them.
   */
  async getCredentials(): Promise<GoogleCredentials> {
    const integration = await db.integration.findFirst({
      where: { organizationId: this.organizationId, dataSourceId: 'GOOGLE' }
    });

    if (!integration || !integration.credentialsReference) {
      return { mockMode: true };
    }

    const aad = `${this.organizationId}:${integration.id}:GOOGLE`;

    try {
      const decrypted = decryptCredentialString(integration.credentialsReference, aad);
      const parsed = JSON.parse(decrypted);
      
      const validated = GoogleCredentialsSchema.parse(parsed);

      const isPlaintext = integration.credentialsReference.trim().startsWith('{');
      const isCBC = !integration.credentialsReference.startsWith('gcm:v1:');
      
      if (isPlaintext || isCBC) {
        // Migration-on-read: upgrade immediately to GCM!
        const reEncrypted = encryptGCM(JSON.stringify(validated), aad);
        await db.integration.update({
          where: { id: integration.id },
          data: { credentialsReference: reEncrypted }
        });

        const firstUser = await db.user.findFirst({ where: { organizationId: this.organizationId } });
        await db.auditLog.create({
          data: {
            organizationId: this.organizationId,
            userId: firstUser?.id || null,
            action: 'CREDENTIAL_ENCRYPTION_MIGRATED_GCM',
            entityType: 'INTEGRATION',
            entityId: integration.id,
            newValue: { format: 'gcm:v1' }
          }
        });
      }

      return validated;
    } catch (e: any) {
      await db.integration.update({
        where: { id: integration.id },
        data: { status: 'ERROR', errorState: `Decryption/Validation failure: ${e.message}` }
      });
      
      console.error(`[SECURITY ERROR] Decryption failure for Org ID ${this.organizationId}: ${e.message}`);
      throw e;
    }
  }

  /**
   * Saves credentials encrypted in the database using GCM.
   */
  async saveCredentials(creds: GoogleCredentials) {
    const validated = GoogleCredentialsSchema.parse(creds);
    const jsonStr = JSON.stringify(validated);

    let integration = await db.integration.findFirst({
      where: { organizationId: this.organizationId, dataSourceId: 'GOOGLE' }
    });

    if (!integration) {
      integration = await db.integration.create({
        data: {
          organizationId: this.organizationId,
          dataSourceId: 'GOOGLE',
          status: 'ACTIVE',
          allowResponsePublishing: false
        }
      });
    }

    const aad = `${this.organizationId}:${integration.id}:GOOGLE`;
    const encrypted = encryptGCM(jsonStr, aad);

    await db.integration.update({
      where: { id: integration.id },
      data: { credentialsReference: encrypted, status: 'ACTIVE', errorState: null }
    });
  }

  /**
   * Returns connection status state.
   */
  async getStatus(): Promise<'READY_FOR_CREDENTIALS' | 'AUTHORIZED' | 'API_ACCESS_REQUIRED' | 'CONNECTED' | 'ERROR'> {
    const creds = await this.getCredentials();
    
    const integration = await db.integration.findFirst({
      where: { organizationId: this.organizationId, dataSourceId: 'GOOGLE' }
    });

    if (!integration || !integration.credentialsReference) {
      return 'READY_FOR_CREDENTIALS';
    }

    if (integration.status === 'ERROR') {
      return 'ERROR';
    }

    if (creds.mockMode) {
      return creds.accountId ? 'CONNECTED' : 'AUTHORIZED';
    }

    if (creds.apiAccessRequired) {
      return 'API_ACCESS_REQUIRED';
    }

    if (creds.accessToken) {
      // Verify if the Google Business APIs are actually enabled and accessible
      try {
        const testRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
          headers: { 'Authorization': `Bearer ${creds.accessToken}` }
        });
        if (!testRes.ok) {
          if (testRes.status === 403 || testRes.status === 400) {
            return 'API_ACCESS_REQUIRED';
          }
          return 'ERROR';
        }
      } catch (err) {
        return 'ERROR';
      }
      return creds.accountId ? 'CONNECTED' : 'AUTHORIZED';
    }

    return 'READY_FOR_CREDENTIALS';
  }

  // ----------------------------------------------------
  // SUB-CLIENTS
  // ----------------------------------------------------

  readonly oauthClient = {
    getAuthorizeUrl: (state: string): string => {
      const clientId = process.env.GOOGLE_CLIENT_ID || 'mock-client-id';
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/integrations/google/callback';
      const scope = 'https://www.googleapis.com/auth/business.manage';
      
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}&access_type=offline&prompt=consent`;
    },

    exchangeCode: async (code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> => {
      const clientId = process.env.GOOGLE_CLIENT_ID || 'mock-client-id';
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'mock-client-secret';
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/integrations/google/callback';

      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Google token exchange failed: ${errText}`);
      }

      const data = await res.json() as any;
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in
      };
    },

    refreshAccessToken: async (refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> => {
      const clientId = process.env.GOOGLE_CLIENT_ID || 'mock-client-id';
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'mock-client-secret';

      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token'
        })
      });

      if (!res.ok) {
        throw new Error('Google token refresh failed');
      }

      const data = await res.json() as any;
      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in
      };
    }
  };

  readonly accountClient = {
    listAccounts: async (accessToken: string): Promise<any[]> => {
      const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok) {
        throw new Error('Failed to list Google Business Profile accounts');
      }

      const data = await res.json() as any;
      return data.accounts || [];
    }
  };

  readonly locationClient = {
    listLocations: async (accessToken: string, accountName: string): Promise<any[]> => {
      const res = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,phone,website,categories,metadata`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!res.ok) {
        throw new Error('Failed to list Google Business Profile locations');
      }

      const data = await res.json() as any;
      return data.locations || [];
    }
  };

  readonly reviewClient = {
    listReviews: async (accessToken: string, accountName: string, locationName: string, pageSize = 50, pageToken?: string): Promise<{ reviews: any[]; nextPageToken?: string }> => {
      const url = new URL(`https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/reviews`);
      url.searchParams.set('pageSize', pageSize.toString());
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok) {
        throw new Error('Failed to list Google Business Profile reviews');
      }

      const data = await res.json() as any;
      return {
        reviews: data.reviews || [],
        nextPageToken: data.nextPageToken
      };
    },

    postReply: async (accessToken: string, accountName: string, locationName: string, reviewId: string, replyText: string): Promise<any> => {
      const res = await fetch(
        `https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/reviews/${reviewId}/reply`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ comment: replyText })
        }
      );

      if (!res.ok) {
        throw new Error('Failed to publish Google review reply');
      }

      return res.json();
    },

    deleteReply: async (accessToken: string, accountName: string, locationName: string, reviewId: string): Promise<void> => {
      const res = await fetch(
        `https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/reviews/${reviewId}/reply`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!res.ok) {
        throw new Error('Failed to delete Google review reply');
      }
    }
  };
}
