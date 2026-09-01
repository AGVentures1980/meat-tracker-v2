export class TripAdvisorConnector {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async getStatus(): Promise<string> {
    return 'REQUIRES_CREDENTIALS';
  }

  async syncReviews(): Promise<any> {
    return {
      status: 'REQUIRES_CREDENTIALS',
      message: 'TripAdvisor integration requires credentials or API key authorization.'
    };
  }
}
