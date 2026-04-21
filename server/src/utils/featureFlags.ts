export const FeatureFlags = {
    FF_CHANNEL_SOURCE_TYPE: process.env.FF_CHANNEL_SOURCE_TYPE === 'true',
    FF_FORECAST_INTELLIGENCE: process.env.FF_FORECAST_INTELLIGENCE === 'true',
    FF_INBOUND_RECONCILIATION: process.env.FF_INBOUND_RECONCILIATION === 'true',
    FF_ENTERPRISE_DASHBOARD: process.env.FF_ENTERPRISE_DASHBOARD === 'true'
};
