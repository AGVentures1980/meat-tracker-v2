import { ContentType } from '@prisma/client';

export interface ExternalLocation {
  externalId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface ExternalContent {
  externalId: string;
  contentType: ContentType;
  authorName?: string;
  authorExternalId?: string;
  title?: string;
  text: string;
  rating?: number;
  url?: string;
  publishedAt: Date;
  rawPayload?: any;
}

export interface SyncResult {
  syncedCount: number;
  errorsCount: number;
  details?: string;
}

export interface DataConnector {
  connect(credentials: string): Promise<void>;
  testConnection(): Promise<{ success: boolean; error?: string }>;
  fetchLocations(): Promise<ExternalLocation[]>;
  fetchContent(externalLocationId: string, lastSyncAt?: Date): Promise<ExternalContent[]>;
  sync(organizationId: string, locationId: string, credentials?: string, lastSyncAt?: Date): Promise<SyncResult>;
}
