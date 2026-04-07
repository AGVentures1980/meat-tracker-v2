import { PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../utils/s3Client';
import { StorageKeyBuilder } from '../utils/storageKeyBuilder';
import { FileSecurity } from '../utils/fileSecurity';
import { emitStructuredLog } from '../utils/vaultMetrics';

const BUCKET_NAME = process.env.AWS_VAULT_BUCKET_NAME || 'brasa-meat-vault-prod';

export class VaultService {
    static async requestUploadUrl(
        scopedPrisma: any,
        companyId: string,
        storeId: number,
        userId: string,
        ip: string,
        documentType: string,
        mimeType: string,
        sizeBytes: number,
        originalFilename: string
    ) {
        if (!BUCKET_NAME) throw new Error('AWS_VAULT_BUCKET_NAME not configured');

        // Strictly validate constraints natively
        const safeExt = FileSecurity.validate(mimeType, sizeBytes);
        const storageKey = StorageKeyBuilder.generateKey(companyId, storeId, documentType, safeExt);

        // Record the PENDING file in Vault table using Scoped client 
        // This validates natively if `storeId` is available in user scope due to scopedPrisma AST wrapper handling writes
        const vaultFile = await scopedPrisma.vaultFile.create({
            data: {
                company_id: companyId,
                store_id: storeId,
                document_type: documentType,
                bucket_name: BUCKET_NAME,
                storage_key: storageKey,
                original_filename: originalFilename,
                mime_type: mimeType,
                size_bytes: sizeBytes,
                uploaded_by_user_id: userId,
                upload_status: 'PENDING'
            }
        });

        // Sync audit log (MANDATORY VERIFICATION LOG - NEVER DISABLED)
        await scopedPrisma.fileAccessLog.create({
            data: {
                user_id: userId,
                company_id: companyId,
                store_id: storeId,
                file_id: vaultFile.id,
                action: 'UPLOAD_REQUEST',
                ip: ip
            }
        });

        // Add optional telemetry hook to satisfy requirements
        if (process.env.ENABLE_VAULT_LOGGING !== 'false') {
            emitStructuredLog({ metric: 'presigned_url_generated', fileId: vaultFile.id, storeId: String(storeId), companyId, userId });
        }

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: storageKey,
            ContentType: mimeType,
            ContentLength: sizeBytes,
            ServerSideEncryption: 'AES256'
        });

        const ttl = parseInt(process.env.VAULT_UPLOAD_TTL_SEC || '900');
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: ttl });

        return { uploadUrl, fileId: vaultFile.id };
    }

    static async confirmUpload(scopedPrisma: any, fileId: string, userId: string, ip: string) {
        const vaultFile = await scopedPrisma.vaultFile.findUnique({ where: { id: fileId } });
        if (!vaultFile) throw new Error('File not found');

        if (vaultFile.upload_status === 'COMPLETED') {
            return vaultFile; // Safe idempotent success
        }

        if (vaultFile.upload_status !== 'PENDING') {
            throw new Error(`File is in invalid state: ${vaultFile.upload_status}`);
        }

        const headCommand = new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: vaultFile.storage_key });
        let headResult;
        try {
            headResult = await s3Client.send(headCommand);
        } catch (e) {
            await scopedPrisma.vaultFile.update({ where: { id: fileId }, data: { upload_status: 'FAILED' } });
            throw new Error('S3 Object unverified: File not found in backend storage');
        }

        const sizeVariance = Math.abs((headResult.ContentLength || 0) - vaultFile.size_bytes) / vaultFile.size_bytes;
        if (sizeVariance > 0.05) {
            await scopedPrisma.vaultFile.update({ where: { id: fileId }, data: { upload_status: 'QUARANTINED' } });
            throw new Error('S3 Object unverified: Content length mismatch threshold exceeded');
        }

        const checksumETag = headResult.ETag ? headResult.ETag.replace(/"/g, '') : null;

        // Execute Optimistic Concurrency limit ensuring atomicity during multiple calls
        const batchUpdate = await scopedPrisma.vaultFile.updateMany({
            where: { id: fileId, upload_status: 'PENDING' },
            data: {
                is_active: true,
                upload_status: 'COMPLETED',
                checksum: checksumETag
            }
        });

        if (batchUpdate.count === 0) {
            const recheck = await scopedPrisma.vaultFile.findUnique({ where: { id: fileId } });
            if (recheck?.upload_status === 'COMPLETED') return recheck;
            throw new Error('Upload completion conflict: state changed mid-validation');
        }

        const updatedFile = await scopedPrisma.vaultFile.findUnique({ where: { id: fileId } });
        
        await scopedPrisma.fileAccessLog.create({
            data: {
                user_id: userId,
                company_id: updatedFile.company_id,
                store_id: updatedFile.store_id,
                file_id: updatedFile.id,
                action: 'UPLOAD_COMPLETED',
                ip: ip
            }
        });

        return updatedFile;
    }

    static async requestDownloadUrl(
        scopedPrisma: any,
        fileId: string,
        userId: string,
        ip: string,
        justification?: string
    ) {
        if (!process.env.AWS_VAULT_BUCKET_NAME) {
            console.warn('WARN: Missing AWS Vault bucket name mapping.');
        }

        // Scoped lookup natively rejects cross-tenant attempts and enforces exact Active gating
        const vaultFile = await scopedPrisma.vaultFile.findFirst({
            where: { 
                id: fileId, 
                deleted_at: null,
                upload_status: 'COMPLETED',
                is_active: true
            }
        });

        if (!vaultFile) {
            throw new Error('404: File not found or access denied');
        }

        // Sync log access (MANDATORY LOG - NEVER DISABLED)
        await scopedPrisma.fileAccessLog.create({
            data: {
                user_id: userId,
                company_id: vaultFile.company_id,
                store_id: vaultFile.store_id,
                file_id: vaultFile.id,
                action: justification ? 'GLOBAL_AUDIT_VIEW' : 'DOWNLOAD_REQUEST',
                ip: ip,
                justification: justification
            }
        });

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: vaultFile.storage_key
        });

        // Restricted TTL on download URLs
        const ttl = parseInt(process.env.VAULT_DOWNLOAD_TTL_SEC || '60');
        const viewUrl = await getSignedUrl(s3Client, command, { expiresIn: ttl });

        return { viewUrl, metadata: vaultFile };
    }
}
