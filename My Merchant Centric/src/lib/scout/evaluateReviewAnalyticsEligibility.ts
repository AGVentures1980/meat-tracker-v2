export interface ReviewAnalyticsEligibilityInput {
  coverageType: 'COMPLETE' | 'PARTIAL' | 'SAMPLE' | 'METADATA_ONLY' | 'UNKNOWN';
  acquisitionMethod: 'CLIENT_IMPORT' | 'MANUAL_VERIFIED' | 'OFFICIAL_API' | 'LICENSED_FEED' | 'PUBLIC_METADATA';
  provenanceMode: 'LIVE' | 'IMPORTED' | 'DEMO';
  importedRecordCount: number;
  dataQualityStatus: 'HIGH' | 'MEDIUM' | 'LOW';
  hasTextContent: boolean;
}

export interface ReviewAnalyticsEligibilityResult {
  browseEligible: boolean;
  textTopicEligible: boolean;
  textSentimentEligible: boolean;
  populationAnalyticsEligible: boolean;
  brandPulseEligible: boolean;
  alertsEligible: boolean;
  reason: string;
}

/**
 * Centralized decision function determining analytics eligibility across review datasets.
 * Enforces strict coverage semantics and dataset-level provenance.
 */
export function evaluateReviewAnalyticsEligibility(
  input: ReviewAnalyticsEligibilityInput
): ReviewAnalyticsEligibilityResult {

  // Rule 1: METADATA_ONLY or zero records
  if (input.coverageType === 'METADATA_ONLY' || input.importedRecordCount === 0 || !input.hasTextContent) {
    return {
      browseEligible: false,
      textTopicEligible: false,
      textSentimentEligible: false,
      populationAnalyticsEligible: false,
      brandPulseEligible: false,
      alertsEligible: false,
      reason: 'METADATA_ONLY coverage or zero review text records present — textual AI analysis is prohibited.'
    };
  }

  // Rule 2: SAMPLE coverage allows exploratory browsing but blocks population-level Brand Pulse claims
  if (input.coverageType === 'SAMPLE') {
    return {
      browseEligible: true,
      textTopicEligible: true,
      textSentimentEligible: true,
      populationAnalyticsEligible: false,
      brandPulseEligible: false,
      alertsEligible: false,
      reason: 'SAMPLE coverage dataset — permits exploratory review browsing but cannot generate population-level Brand Pulse scores or alerts.'
    };
  }

  // Rule 3: UNKNOWN coverage
  if (input.coverageType === 'UNKNOWN') {
    return {
      browseEligible: true,
      textTopicEligible: true,
      textSentimentEligible: true,
      populationAnalyticsEligible: false,
      brandPulseEligible: false,
      alertsEligible: false,
      reason: 'UNKNOWN coverage dataset — coverage boundaries unverified. Population-level analytics blocked until verified.'
    };
  }

  // Rule 4: COMPLETE or PARTIAL coverage with traceable provenance
  const isPopulationEligible = (input.coverageType === 'COMPLETE' || input.coverageType === 'PARTIAL') && input.importedRecordCount >= 10;
  const isBrandPulseEligible = isPopulationEligible && input.importedRecordCount >= 20 && input.dataQualityStatus !== 'LOW';
  const isAlertsEligible = isPopulationEligible && input.dataQualityStatus !== 'LOW';

  return {
    browseEligible: true,
    textTopicEligible: true,
    textSentimentEligible: true,
    populationAnalyticsEligible: isPopulationEligible,
    brandPulseEligible: isBrandPulseEligible,
    alertsEligible: isAlertsEligible,
    reason: `Legitimate ${input.coverageType} dataset (${input.importedRecordCount} records, Data Quality: ${input.dataQualityStatus}) — eligible for textual intelligence.`
  };
}
