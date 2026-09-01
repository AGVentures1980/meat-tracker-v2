import crypto from 'crypto';

export interface RawReviewRow {
  externalReviewId?: string | null;
  reviewText: string;
  rating?: number | null;
  authorName?: string | null;
  publishedAt?: string | Date | null;
  sourceUrl?: string | null;
  locationId?: string | null;
}

export interface ValidatedReviewRow {
  externalReviewId: string | null;
  reviewText: string;
  rating: number | null;
  authorName: string | null;
  publishedAt: Date | null;
  sourceUrl: string | null;
  contentHash: string;
  isValid: boolean;
  isDuplicate: boolean;
  rejectionReason?: string;
}

export interface DeduplicationResult {
  accepted: ValidatedReviewRow[];
  duplicates: ValidatedReviewRow[];
  rejected: ValidatedReviewRow[];
  totalRowsProcessed: number;
  duplicateCount: number;
  rejectedCount: number;
}

/**
 * Computes a deterministic SHA-256 hash of normalized review content.
 */
export function computeReviewContentHash(text: string, publishedAt?: Date | null, authorName?: string | null): string {
  const normText = (text || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const normDate = publishedAt ? publishedAt.toISOString().substring(0, 10) : 'NO_DATE';
  const normAuthor = (authorName || '').trim().toLowerCase();
  return crypto.createHash('sha256').update(`${normText}|${normDate}|${normAuthor}`).digest('hex');
}

/**
 * Validates raw import rows and performs multi-pass deduplication.
 */
export function validateAndDeduplicateReviews(
  rows: RawReviewRow[],
  existingExternalIds: Set<string> = new Set(),
  existingContentHashes: Set<string> = new Set()
): DeduplicationResult {
  const accepted: ValidatedReviewRow[] = [];
  const duplicates: ValidatedReviewRow[] = [];
  const rejected: ValidatedReviewRow[] = [];

  const seenBatchExtIds = new Set<string>();
  const seenBatchHashes = new Set<string>();

  for (const row of rows) {
    const rawText = (row.reviewText || '').trim();

    // Validation 1: Blank Text allowed if valid Rating exists (Rating-only reviews)
    if (!rawText && (row.rating === undefined || row.rating === null)) {
      rejected.push({
        externalReviewId: row.externalReviewId || null,
        reviewText: '',
        rating: row.rating || null,
        authorName: row.authorName || null,
        publishedAt: null,
        sourceUrl: row.sourceUrl || null,
        contentHash: '',
        isValid: false,
        isDuplicate: false,
        rejectionReason: 'TEXT_BLANK: Review text and rating cannot both be empty.'
      });
      continue;
    }

    // Validation 2: Rating Range
    let ratingVal: number | null = null;
    if (row.rating !== undefined && row.rating !== null) {
      const numRating = parseFloat(String(row.rating));
      if (isNaN(numRating) || numRating < 1.0 || numRating > 5.0) {
        rejected.push({
          externalReviewId: row.externalReviewId || null,
          reviewText: rawText,
          rating: null,
          authorName: row.authorName || null,
          publishedAt: null,
          sourceUrl: row.sourceUrl || null,
          contentHash: '',
          isValid: false,
          isDuplicate: false,
          rejectionReason: `INVALID_RATING: Rating '${row.rating}' is outside valid range (1.0 - 5.0 stars).`
        });
        continue;
      }
      ratingVal = numRating;
    }

    // Validation 3: Date Parsing
    let pubDate: Date | null = null;
    if (row.publishedAt) {
      const parsed = new Date(row.publishedAt);
      if (!isNaN(parsed.getTime())) {
        pubDate = parsed;
      }
    }

    const extId = (row.externalReviewId || '').trim();
    const contentHash = computeReviewContentHash(rawText, pubDate, row.authorName);

    // Deduplication Rule Priority:
    // 1. Authoritative External Review ID (when present)
    if (extId) {
      if (existingExternalIds.has(extId) || seenBatchExtIds.has(extId)) {
        duplicates.push({
          externalReviewId: extId,
          reviewText: rawText,
          rating: ratingVal,
          authorName: row.authorName || null,
          publishedAt: pubDate,
          sourceUrl: row.sourceUrl || null,
          contentHash,
          isValid: true,
          isDuplicate: true,
          rejectionReason: `DUPLICATE_EXTERNAL_ID: Review ID '${extId}' already exists in database or current batch.`
        });
        continue;
      }

      seenBatchExtIds.add(extId);
      if (contentHash) seenBatchHashes.add(contentHash);

      accepted.push({
        externalReviewId: extId,
        reviewText: rawText,
        rating: ratingVal,
        authorName: row.authorName || null,
        publishedAt: pubDate,
        sourceUrl: row.sourceUrl || null,
        contentHash,
        isValid: true,
        isDuplicate: false
      });
      continue;
    }

    // 2. Content Hash Match (Fallback when externalReviewId is absent)
    if (existingContentHashes.has(contentHash) || seenBatchHashes.has(contentHash)) {
      duplicates.push({
        externalReviewId: null,
        reviewText: rawText,
        rating: ratingVal,
        authorName: row.authorName || null,
        publishedAt: pubDate,
        sourceUrl: row.sourceUrl || null,
        contentHash,
        isValid: true,
        isDuplicate: true,
        rejectionReason: 'DUPLICATE_CONTENT_HASH: Identical review text, date, and author already imported.'
      });
      continue;
    }

    seenBatchHashes.add(contentHash);

    accepted.push({
      externalReviewId: null,
      reviewText: rawText,
      rating: ratingVal,
      authorName: row.authorName || null,
      publishedAt: pubDate,
      sourceUrl: row.sourceUrl || null,
      contentHash,
      isValid: true,
      isDuplicate: false
    });
  }

  return {
    accepted,
    duplicates,
    rejected,
    totalRowsProcessed: rows.length,
    duplicateCount: duplicates.length,
    rejectedCount: rejected.length
  };
}
