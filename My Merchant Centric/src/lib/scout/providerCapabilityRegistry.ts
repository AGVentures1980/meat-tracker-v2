export interface ProviderCapabilityContract {
  providerId: string;
  displayName: string;
  supportsReviewText: boolean;
  supportsHistoricalReviewText: boolean;
  supportsFullHistory: boolean;
  supportsRatings: boolean;
  supportsPublishedAt: boolean;
  supportsExternalReviewId: boolean;
  supportsSourceUrl: boolean;
  supportsOwnerResponses: boolean;
  coverageLimitations: string;
  authenticationRequired: boolean;
  authorizedForProduction: boolean;
  statusLabel: 'METADATA_ONLY' | 'EXCERPTS_ONLY' | 'FULL_TEXT_CAPABLE' | 'MANUAL_ATTESTED';
}

export const PROVIDER_CAPABILITY_REGISTRY: Record<string, ProviderCapabilityContract> = {
  GOOGLE: {
    providerId: 'GOOGLE',
    displayName: 'Google Places API (New)',
    supportsReviewText: false,
    supportsHistoricalReviewText: false,
    supportsFullHistory: false,
    supportsRatings: true,
    supportsPublishedAt: false,
    supportsExternalReviewId: true,
    supportsSourceUrl: true,
    supportsOwnerResponses: false,
    coverageLimitations: 'Google Places API v1 provides public baseline metadata (rating, total rating count, Place ID). It does NOT provide complete historical review text.',
    authenticationRequired: true,
    authorizedForProduction: true,
    statusLabel: 'METADATA_ONLY'
  },
  YELP: {
    providerId: 'YELP',
    displayName: 'Yelp Fusion API',
    supportsReviewText: false,
    supportsHistoricalReviewText: false,
    supportsFullHistory: false,
    supportsRatings: true,
    supportsPublishedAt: false,
    supportsExternalReviewId: true,
    supportsSourceUrl: true,
    supportsOwnerResponses: false,
    coverageLimitations: 'Yelp Fusion API returns maximum 3 truncated review excerpts. It is NOT capable of complete historical review text ingestion. Bulk review text requires Client Import.',
    authenticationRequired: true,
    authorizedForProduction: false,
    statusLabel: 'EXCERPTS_ONLY'
  },
  CLIENT_IMPORT: {
    providerId: 'CLIENT_IMPORT',
    displayName: 'Client Export File (CSV/XLSX)',
    supportsReviewText: true,
    supportsHistoricalReviewText: true,
    supportsFullHistory: true,
    supportsRatings: true,
    supportsPublishedAt: true,
    supportsExternalReviewId: true,
    supportsSourceUrl: true,
    supportsOwnerResponses: true,
    coverageLimitations: 'Coverage depends on client export boundaries (COMPLETE, PARTIAL, or SAMPLE as declared by operator).',
    authenticationRequired: false,
    authorizedForProduction: true,
    statusLabel: 'FULL_TEXT_CAPABLE'
  },
  MANUAL_VERIFIED: {
    providerId: 'MANUAL_VERIFIED',
    displayName: 'Operator Verified Manual Entry',
    supportsReviewText: true,
    supportsHistoricalReviewText: true,
    supportsFullHistory: false,
    supportsRatings: true,
    supportsPublishedAt: true,
    supportsExternalReviewId: true,
    supportsSourceUrl: true,
    supportsOwnerResponses: true,
    coverageLimitations: 'Single-review manual entry. Requires operator attestation and source evidence.',
    authenticationRequired: true,
    authorizedForProduction: true,
    statusLabel: 'MANUAL_ATTESTED'
  }
};

export function getProviderCapability(providerId: string): ProviderCapabilityContract {
  return PROVIDER_CAPABILITY_REGISTRY[providerId] || {
    providerId,
    displayName: providerId,
    supportsReviewText: false,
    supportsHistoricalReviewText: false,
    supportsFullHistory: false,
    supportsRatings: true,
    supportsPublishedAt: false,
    supportsExternalReviewId: false,
    supportsSourceUrl: false,
    supportsOwnerResponses: false,
    coverageLimitations: 'Unregistered provider. Capability unverified.',
    authenticationRequired: false,
    authorizedForProduction: false,
    statusLabel: 'METADATA_ONLY'
  };
}
