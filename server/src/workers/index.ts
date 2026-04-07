// ==========================================
// DATADOG APM TRACER (Must be strictly line 1)
// ==========================================
import tracer from 'dd-trace';
tracer.init({
    service: process.env.DD_SERVICE || 'brasa-os-backend',
    env: process.env.DD_ENV || 'production',
    logInjection: true,
});

import './ocrProcessor';
// import './yieldAggregator'; // Future workers go here

console.log('Worker Service Successfully Booted and Listening for Jobs...');
