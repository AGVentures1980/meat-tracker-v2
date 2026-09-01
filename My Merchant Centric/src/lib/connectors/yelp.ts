export class YelpConnector {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async getStatus(): Promise<string> {
    return 'REQUIRES_PARTNER_ACCESS';
  }

  async syncReviews(): Promise<any> {
    return {
      status: 'REQUIRES_PARTNER_ACCESS',
      message: 'Yelp integration requires official enterprise partner credentials.'
    };
  }
}
