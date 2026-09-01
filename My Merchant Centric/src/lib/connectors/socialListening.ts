export class SocialListeningConnector {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async getStatus(): Promise<string> {
    return 'NOT_CONFIGURED';
  }

  async syncFeed(): Promise<any> {
    return {
      status: 'NOT_CONFIGURED',
      message: 'Social Listening keyword queries are not configured.'
    };
  }
}
