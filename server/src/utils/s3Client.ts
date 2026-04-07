import { S3Client } from '@aws-sdk/client-s3';

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || 'us-east-1';

if (!accessKeyId || !secretAccessKey) {
    if (process.env.NODE_ENV === 'production') {
        console.error('FATAL ERROR: Missing AWS credentials in production environment.');
        process.exit(1); 
    } else {
        console.warn('WARNING: Missing AWS credentials. Vault operations will fail.');
    }
}

export const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || ''
    }
});
