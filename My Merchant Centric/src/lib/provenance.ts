/**
 * BRASA Brand Pulse™ Provenance & Live Data Enforcement Helper
 *
 * Centralizes the rule: LIVE + legitimate IMPORTED data ONLY.
 * Excludes all DEMO, SEED, or MOCK records across all production queries.
 */

export function buildLiveDataScope() {
  return {
    provenanceMode: { in: ['LIVE', 'IMPORTED'] }
  };
}

export function buildLiveLocationRelationScope() {
  return {
    provenanceMode: { in: ['LIVE', 'IMPORTED'] },
    location: {
      provenanceMode: { in: ['LIVE', 'IMPORTED'] }
    }
  };
}
