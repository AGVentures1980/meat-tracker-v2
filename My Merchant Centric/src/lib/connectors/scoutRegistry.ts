export interface SourceCapabilities {
  provider: string;
  supportsDiscovery: boolean;
  supportsPublicRating: boolean;
  supportsReviewCount: boolean;
  supportsReviewContent: boolean | string;
  supportsHistoricalContent: boolean;
  supportsOfficialApi: boolean;
  supportsResponses: boolean;
  supportsCompetitorData: boolean;
  supportsAutomatedMonitoring: boolean;
  adapterIdentifier?: string;
}

export const ScoutRegistry: Record<string, SourceCapabilities> = {
  GOOGLE: {
    provider: 'GOOGLE',
    supportsDiscovery: true,
    supportsPublicRating: true,
    supportsReviewCount: true,
    supportsReviewContent: 'SAMPLE_ONLY',
    supportsHistoricalContent: true,
    supportsOfficialApi: true,
    supportsResponses: true,
    supportsCompetitorData: true,
    supportsAutomatedMonitoring: true,
    adapterIdentifier: 'GOOGLE_PLACES',
  },
  YELP: {
    provider: 'YELP',
    supportsDiscovery: true,
    supportsPublicRating: true,
    supportsReviewCount: true,
    supportsReviewContent: true, // conditional/partial
    supportsHistoricalContent: true,
    supportsOfficialApi: true,
    supportsResponses: false,
    supportsCompetitorData: true,
    supportsAutomatedMonitoring: true,
  },
  OPENTABLE: {
    provider: 'OPENTABLE',
    supportsDiscovery: true,
    supportsPublicRating: true,
    supportsReviewCount: true,
    supportsReviewContent: false, // unless approved
    supportsHistoricalContent: false,
    supportsOfficialApi: false,
    supportsResponses: false,
    supportsCompetitorData: true,
    supportsAutomatedMonitoring: true,
  },
  TRIPADVISOR: {
    provider: 'TRIPADVISOR',
    supportsDiscovery: true,
    supportsPublicRating: true,
    supportsReviewCount: true,
    supportsReviewContent: false,
    supportsHistoricalContent: false,
    supportsOfficialApi: false,
    supportsResponses: false,
    supportsCompetitorData: true,
    supportsAutomatedMonitoring: true,
  },
  FACEBOOK: {
    provider: 'FACEBOOK',
    supportsDiscovery: true,
    supportsPublicRating: true,
    supportsReviewCount: true,
    supportsReviewContent: true,
    supportsHistoricalContent: true,
    supportsOfficialApi: true,
    supportsResponses: true,
    supportsCompetitorData: false,
    supportsAutomatedMonitoring: false,
  },
  INSTAGRAM: {
    provider: 'INSTAGRAM',
    supportsDiscovery: true,
    supportsPublicRating: false,
    supportsReviewCount: false,
    supportsReviewContent: true,
    supportsHistoricalContent: true,
    supportsOfficialApi: true,
    supportsResponses: true,
    supportsCompetitorData: false,
    supportsAutomatedMonitoring: false,
  },
  TIKTOK: {
    provider: 'TIKTOK',
    supportsDiscovery: true,
    supportsPublicRating: false,
    supportsReviewCount: false,
    supportsReviewContent: true,
    supportsHistoricalContent: true,
    supportsOfficialApi: false,
    supportsResponses: false,
    supportsCompetitorData: false,
    supportsAutomatedMonitoring: false,
  },
  YOUTUBE: {
    provider: 'YOUTUBE',
    supportsDiscovery: true,
    supportsPublicRating: false,
    supportsReviewCount: false,
    supportsReviewContent: true,
    supportsHistoricalContent: true,
    supportsOfficialApi: true,
    supportsResponses: true,
    supportsCompetitorData: false,
    supportsAutomatedMonitoring: false,
  },
  REDDIT: {
    provider: 'REDDIT',
    supportsDiscovery: true,
    supportsPublicRating: false,
    supportsReviewCount: false,
    supportsReviewContent: true,
    supportsHistoricalContent: true,
    supportsOfficialApi: true,
    supportsResponses: false,
    supportsCompetitorData: false,
    supportsAutomatedMonitoring: false,
  },
  OTHER: {
    provider: 'OTHER',
    supportsDiscovery: false,
    supportsPublicRating: false,
    supportsReviewCount: false,
    supportsReviewContent: false,
    supportsHistoricalContent: false,
    supportsOfficialApi: false,
    supportsResponses: false,
    supportsCompetitorData: false,
    supportsAutomatedMonitoring: false,
  },
};

export function getSourceCapabilities(provider: string): SourceCapabilities {
  return ScoutRegistry[provider.toUpperCase()] || ScoutRegistry.OTHER;
}
