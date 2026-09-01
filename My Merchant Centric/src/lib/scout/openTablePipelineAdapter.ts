export interface OpenTableCsvSchemaResult {
  isValid: boolean;
  schemaVersion: string;
  schemaStatus: 'VALID' | 'SCHEMA_CHANGED';
  missingColumns: string[];
  extraColumns: string[];
}

export const OPENTABLE_EXPECTED_COLUMNS = [
  'Source',
  'Restaurant name',
  'Restaurant ID',
  'Guest name',
  'Review date',
  'Visit date',
  'Server name',
  'Overall rating',
  'Food',
  'Service',
  'Ambience',
  'Value',
  'Noise',
  'Review comments',
  'Private note',
  'Tags added by diner',
  'Dining occasion',
  'Recommended',
  'Restaurant reply',
  'Review ID'
];

/**
 * Detects CSV schema changes or version drifts in OpenTable Daily Reports.
 */
export function detectOpenTableCsvSchema(headers: string[]): OpenTableCsvSchemaResult {
  const normHeaders = headers.map(h => h.trim().replace(/^["']|["']$/g, ''));
  const missing = OPENTABLE_EXPECTED_COLUMNS.filter(col => !normHeaders.includes(col));
  const extra = normHeaders.filter(col => !OPENTABLE_EXPECTED_COLUMNS.includes(col));

  if (missing.length > 0) {
    return {
      isValid: false,
      schemaVersion: '1.0',
      schemaStatus: 'SCHEMA_CHANGED',
      missingColumns: missing,
      extraColumns: extra
    };
  }

  return {
    isValid: true,
    schemaVersion: '1.0',
    schemaStatus: 'VALID',
    missingColumns: [],
    extraColumns: extra
  };
}

export interface EmailIngestionMatchingRules {
  allowedSenderDomains: string[];
  subjectPatterns: string[];
  requiredAttachmentExtension: string;
  authenticationProtocol: 'OAUTH2_GRAPH' | 'OAUTH2_GOOGLE' | 'UNAUTHORIZED';
  mailboxActive: boolean;
}

export const EMAIL_INGESTION_RULES_SPEC: EmailIngestionMatchingRules = {
  allowedSenderDomains: ['opentable.com', 'reports.opentable.com'],
  subjectPatterns: ['Daily review report', 'OpenTable Daily Review Report'],
  requiredAttachmentExtension: '.csv',
  authenticationProtocol: 'OAUTH2_GOOGLE',
  mailboxActive: false // STRICT SECURITY: Mailbox is NOT active in Phase 5B-1
};
