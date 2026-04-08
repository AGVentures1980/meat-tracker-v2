import winston from 'winston';
import crypto from 'crypto';

const env = process.env.NODE_ENV || 'development';
const slackWebhookUrl = process.env.SLACK_SRE_WEBHOOK_URL;

const format = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const SRELogger = winston.createLogger({
  level: 'info',
  format,
  defaultMeta: { service: 'brasa-api-sre' },
  transports: [
    new winston.transports.Console({
      format: env === 'development' ? winston.format.simple() : format
    })
  ]
});

export class SREAlerts {
  static async sendFatalAlert(trigger: string, reason: string, details: any = {}) {
    const payload = {
      timestamp: new Date().toISOString(),
      level: 'FATAL',
      env,
      trigger,
      reason,
      correlation_id: crypto.randomUUID(),
      details
    };

    SRELogger.error(`[SRE ALERT] ${trigger}: ${reason}`, payload);

    if (slackWebhookUrl) {
      try {
        await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 *FATAL SRE ALERT (${env.toUpperCase()})*\n*Trigger:* ${trigger}\n*Reason:* ${reason}\n\`\`\`${JSON.stringify(details, null, 2)}\`\`\``
          })
        });
      } catch (err) {
        SRELogger.error('Failed to send Slack alert', err);
      }
    } else {
      SRELogger.warn('SLACK_SRE_WEBHOOK_URL not defined. SRE Alert dropped.');
    }
  }

  static auditLog(action: string, actor: string, details: any = {}) {
    SRELogger.info(`[SRE AUDIT] ${action}`, {
      level: 'AUDIT',
      actor,
      action,
      env,
      timestamp: new Date().toISOString(),
      details
    });
  }
}
