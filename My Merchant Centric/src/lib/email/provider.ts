export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class MockEmailProvider implements EmailProvider {
  async sendEmail(payload: EmailPayload) {
    console.log(`==================================================`);
    console.log(`[MOCK EMAIL] DISPATCHED TO: ${payload.to}`);
    console.log(`[MOCK EMAIL] SUBJECT: ${payload.subject}`);
    console.log(`[MOCK EMAIL] CONTENT:`);
    console.log(payload.html);
    console.log(`==================================================`);
    return { success: true, messageId: `mock-msg-${Date.now()}` };
  }
}

// Export the active provider instance (mock by default, can be extended to Resend/SES)
export const emailProvider: EmailProvider = new MockEmailProvider();
