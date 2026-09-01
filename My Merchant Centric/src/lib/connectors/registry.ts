import { GoogleBusinessProfileConnector } from './google';
import { YelpConnector } from './yelp';
import { TripAdvisorConnector } from './tripadvisor';
import { SocialListeningConnector } from './socialListening';

export function getConnector(dataSourceId: string, organizationId: string) {
  switch (dataSourceId) {
    case 'GOOGLE':
      return new GoogleBusinessProfileConnector(organizationId);
    case 'YELP':
      return new YelpConnector(organizationId);
    case 'TRIPADVISOR':
      return new TripAdvisorConnector(organizationId);
    case 'SOCIAL_LISTENING':
      return new SocialListeningConnector(organizationId);
    default:
      throw new Error(`Unsupported data source connector: ${dataSourceId}`);
  }
}
