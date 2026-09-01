import { AcquisitionMethod, CoverageType } from '@prisma/client';

export type AdapterStatus =
  | 'NOT_CONFIGURED'
  | 'CONFIGURED'
  | 'OPERATIONAL'
  | 'DEGRADED'
  | 'BLOCKED_BY_PROVIDER'
  | 'RATE_LIMITED'
  | 'ERROR';

export interface PlaceCandidate {
  id: string;
  displayName: string;
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUri?: string;
  primaryType?: string;
  latitude?: number;
  longitude?: number;
}

export interface PlaceDetails {
  id: string;
  displayName: string;
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string; // OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY
  websiteUri?: string;
  googleMapsUri?: string;
  primaryType?: string;
  latitude?: number;
  longitude?: number;
}

export class GooglePlacesAdapter {
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || null;
  }

  public getAdapterStatus(): AdapterStatus {
    if (!this.apiKey) {
      return 'NOT_CONFIGURED';
    }
    return 'CONFIGURED';
  }

  /**
   * Performs a lightweight Places API call to verify key usability and operational health.
   */
  public async healthCheck(): Promise<AdapterStatus> {
    if (!this.apiKey) {
      return 'NOT_CONFIGURED';
    }
    try {
      const testPlaceId = 'ChIJHdigC67DwogRkWjPRn8SUbQ'; // Texas de Brazil Tampa
      const url = `https://places.googleapis.com/v1/places/${testPlaceId}`;
      const headers = {
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'id',
      };
      const response = await fetch(url, { method: 'GET', headers });
      if (response.ok) {
        return 'OPERATIONAL';
      }
      if (response.status === 403 || response.status === 401) {
        return 'BLOCKED_BY_PROVIDER';
      }
      if (response.status === 429) {
        return 'RATE_LIMITED';
      }
      return 'ERROR';
    } catch (err) {
      return 'ERROR';
    }
  }

  /**
   * Search candidate storefronts using Places API (New) Text Search.
   */
  public async discoverPlaces(textQuery: string): Promise<PlaceCandidate[]> {
    const status = this.getAdapterStatus();
    if (status === 'NOT_CONFIGURED') {
      throw new Error('GOOGLE_PLACES_NOT_CONFIGURED: Google Places API Key is missing in environment configuration.');
    }

    try {
      const url = 'https://places.googleapis.com/v1/places:searchText';
      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey!,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri,places.primaryType,places.location',
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ textQuery }),
      });

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          throw new Error('GOOGLE_PLACES_AUTH_FAILED: Authorization failed. Check Google Cloud Places API key validation.');
        }
        if (response.status === 429) {
          throw new Error('GOOGLE_PLACES_RATE_LIMITED: Google API rate limit hit.');
        }
        throw new Error(`GOOGLE_PLACES_PROVIDER_ERROR: Server returned status ${response.status}`);
      }

      const data = await response.json();
      const rawPlaces = data.places || [];

      return rawPlaces.map((p: any) => this.normalizePlaceCandidate(p));
    } catch (err: any) {
      if (err.message?.includes('GOOGLE_PLACES_')) {
        throw err;
      }
      throw new Error(`GOOGLE_PLACES_PROVIDER_ERROR: Network/API call failed. Details: ${err.message}`);
    }
  }

  /**
   * Fetch detailed metadata for a specific Place ID using Places API (New).
   */
  public async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    const status = this.getAdapterStatus();
    if (status === 'NOT_CONFIGURED') {
      throw new Error('GOOGLE_PLACES_NOT_CONFIGURED: Google Places API Key is missing in environment.');
    }

    try {
      const url = `https://places.googleapis.com/v1/places/${placeId}`;
      const headers = {
        'X-Goog-Api-Key': this.apiKey!,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,rating,userRatingCount,websiteUri,googleMapsUri,primaryType,location,businessStatus',
      };

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          throw new Error('GOOGLE_PLACES_AUTH_FAILED: Google Places details auth failed.');
        }
        if (response.status === 404) {
          throw new Error('GOOGLE_PLACES_NO_MATCH: Storefront profile not found.');
        }
        if (response.status === 429) {
          throw new Error('GOOGLE_PLACES_RATE_LIMITED: Google details limit hit.');
        }
        throw new Error(`GOOGLE_PLACES_PROVIDER_ERROR: Details fetch status ${response.status}`);
      }

      const data = await response.json();
      return this.normalizePlaceMetadata(data);
    } catch (err: any) {
      if (err.message?.includes('GOOGLE_PLACES_')) {
        throw err;
      }
      throw new Error(`GOOGLE_PLACES_PROVIDER_ERROR: Network/API call failed. Details: ${err.message}`);
    }
  }

  private normalizePlaceCandidate(raw: any): PlaceCandidate {
    const name = typeof raw.displayName === 'object' ? raw.displayName?.text : raw.displayName;
    return {
      id: raw.id,
      displayName: name || 'Google Storefront',
      formattedAddress: raw.formattedAddress || '',
      rating: raw.rating ? parseFloat(raw.rating) : undefined,
      userRatingCount: raw.userRatingCount ? parseInt(raw.userRatingCount) : undefined,
      websiteUri: raw.websiteUri || undefined,
      googleMapsUri: raw.googleMapsUri || undefined,
      primaryType: raw.primaryType || undefined,
      latitude: raw.location?.latitude || undefined,
      longitude: raw.location?.longitude || undefined,
    };
  }

  private normalizePlaceMetadata(raw: any): PlaceDetails {
    const name = typeof raw.displayName === 'object' ? raw.displayName?.text : raw.displayName;
    return {
      id: raw.id,
      displayName: name || 'Google Storefront',
      formattedAddress: raw.formattedAddress || '',
      rating: raw.rating ? parseFloat(raw.rating) : undefined,
      userRatingCount: raw.userRatingCount ? parseInt(raw.userRatingCount) : undefined,
      businessStatus: raw.businessStatus || 'OPERATIONAL',
      websiteUri: raw.websiteUri || undefined,
      googleMapsUri: raw.googleMapsUri || undefined,
      primaryType: raw.primaryType || undefined,
      latitude: raw.location?.latitude || undefined,
      longitude: raw.location?.longitude || undefined,
    };
  }
}
