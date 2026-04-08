import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        errors({ stack: true }), 
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        process.env.NODE_ENV === 'production' ? json() : combine(
            colorize(),
            printf(({ level, message, timestamp, stack, requestId, companyId }) => {
                const reqContext = requestId ? `[req:${requestId}]` : '';
                const tenantContext = companyId ? `[tenant:${companyId}]` : '';
                const stackTrace = stack ? `\n${stack}` : '';
                return `${timestamp} ${level} ${reqContext}${tenantContext}: ${message}${stackTrace}`;
            })
        )
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// 2. SOC2 COMPLIANCE SINK (Datadog via Native Http Transport)
if (process.env.DATADOG_API_KEY || process.env.DD_API_KEY) {
    const ddSite = process.env.DD_SITE || 'datadoghq.com';
    const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
    
    logger.add(new winston.transports.Http({
        host: `http-intake.logs.${ddSite}`,
        path: `/api/v2/logs?dd-api-key=${apiKey}&ddsource=nodejs&service=brasa-os-backend`,
        ssl: true
    }));
    logger.info(`Datadog Logging Transport initialized successfully on site: ${ddSite}`);
}

// Avoid crashes if the user accidentally calls console directly in new PRs
export const hijackConsoleLogs = () => {
    console.log = (...args) => logger.info(args.join(' '));
    console.info = (...args) => logger.info(args.join(' '));
    console.warn = (...args) => logger.warn(args.join(' '));
    console.error = (...args) => {
        const msg = args.join(' ');
        // Prevent false failure signals in Railway logs from npm/prisma
        if (msg.includes('npm notice') || msg.includes('Update available') || msg.includes('Prisma')) {
            logger.info(msg);
        } else {
            logger.error(msg);
        }
    };
};
