import { Request, Response } from 'express';
import { VaultService } from '../services/vault.service';
import { emitMetric, emitStructuredLog, VaultCircuitBreaker } from '../utils/vaultMetrics';
import { PrismaClient } from '@prisma/client';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../utils/s3Client';

const globalPrisma = new PrismaClient();

export class VaultController {
    static async requestUpload(req: Request, res: Response) {
        const startTimestamp = Date.now();
        const user = (req as any).user || { id: 'unknown', companyId: 'unknown' };
        
        // Tenant-Aware Kill Switch Evaluation
        if (!VaultCircuitBreaker.isVaultEnabled(user.companyId || user.company_id)) {
            return res.status(503).json({ error: 'Vault systems disabled for this tenant.', code: 'VAULT_OFFLINE' });
        }

        if (process.env.ENABLE_VAULT_UPLOAD === 'false') {
            return res.status(503).json({ error: 'Vault uploads are temporarily disabled by SRE override.' });
        }
        try {
            const scopedPrisma = (req as any).scopedPrisma;
            const ip = req.ip || req.socket.remoteAddress || 'unknown';

            const { document_type, mime_type, size_bytes, original_filename, store_id } = req.body;

            if (!document_type || !mime_type || !size_bytes || !original_filename || !store_id) {
                return res.status(400).json({ error: 'Missing required upload parameters' });
            }

            const result = await VaultService.requestUploadUrl(
                scopedPrisma,
                user.companyId || user.company_id,
                Number(store_id),
                user.id,
                ip,
                document_type,
                mime_type,
                Number(size_bytes),
                original_filename
            );

            const latency = Date.now() - startTimestamp;
            emitMetric({ metric: 'upload_request_success', endpoint: '/vault/request-upload', status: 200, companyId: user.companyId || user.company_id, latencyMs: latency });
            return res.json(result);
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            const latency = Date.now() - startTimestamp;
            const msg = error?.message || String(error);
            const user = (req as any).user || { id: 'unknown', companyId: 'unknown' };
            emitStructuredLog({ metric: 'upload_request_failure', error: msg, endpoint: '/vault/request-upload', status: msg.includes('400') ? 400 : 500, companyId: user.companyId || user.company_id, userId: user.id, latencyMs: latency });
            
            if (msg.includes('400')) {
                return res.status(400).json({ error: msg });
            }
            return res.status(500).json({ error: 'Internal secure storage error', details: msg });
        }
    }

    static async confirmUpload(req: Request, res: Response) {
        const startTimestamp = Date.now();
        const user = (req as any).user || { id: 'unknown', companyId: 'unknown' };
        
        if (!VaultCircuitBreaker.isVaultEnabled(user.companyId || user.company_id)) {
            return res.status(503).json({ error: 'Vault systems disabled for this tenant.', code: 'VAULT_OFFLINE' });
        }
        
        try {
            const scopedPrisma = (req as any).scopedPrisma;
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            const { file_id } = req.body;

            if (!file_id) return res.status(400).json({ error: 'Missing file_id' });

            await VaultService.confirmUpload(scopedPrisma, file_id, user.id, ip);
            
            const latency = Date.now() - startTimestamp;
            emitMetric({ metric: 'upload_confirm_success', endpoint: '/vault/confirm-upload', status: 200, companyId: user.companyId || user.company_id, latencyMs: latency });
            return res.json({ success: true, message: 'File is now active' });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            const latency = Date.now() - startTimestamp;
            const msg = error?.message || String(error);
            const user = (req as any).user || { id: 'unknown', companyId: 'unknown' };
            
            if (msg.includes('conflict')) {
                emitMetric({ metric: 'upload_confirm_conflict_resolved', endpoint: '/vault/confirm-upload', status: 200, companyId: user.companyId || user.company_id, latencyMs: latency });
                // Return 200 safely for idempotent resolution of concurrent requests
                return res.json({ success: true, message: 'File is already active (Conflict gracefully resolved)' });
            }

            emitStructuredLog({ metric: 'upload_confirm_failure', error: msg, fileId: req.body.file_id, endpoint: '/vault/confirm-upload', status: 500, userId: user.id, companyId: user.companyId || user.company_id, latencyMs: latency });
            return res.status(500).json({ error: 'Confirmation failed' });
        }
    }

    static async accessFile(req: Request, res: Response) {
        const startTimestamp = Date.now();
        const user = (req as any).user || { id: 'unknown', companyId: 'unknown' };

        if (!VaultCircuitBreaker.isVaultEnabled(user.companyId || user.company_id)) {
            return res.status(503).json({ error: 'Vault systems disabled for this tenant.', code: 'VAULT_OFFLINE' });
        }

        if (process.env.ENABLE_VAULT_DOWNLOAD === 'false') {
            return res.status(503).json({ error: 'Vault downloads are temporarily disabled by SRE override.' });
        }
        try {
            const scopedPrisma = (req as any).scopedPrisma;
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            const fileId = req.params.id;
            
            const justification = req.headers['x-audit-reason'] as string | undefined;

            if (user.scope?.type === 'GLOBAL' && !justification) {
                return res.status(403).json({ error: 'X-Audit-Reason header is mandatory for GLOBAL vault access' });
            }

            const result = await VaultService.requestDownloadUrl(
                scopedPrisma,
                fileId,
                user.id,
                ip,
                justification
            );

            const latency = Date.now() - startTimestamp;
            emitMetric({ metric: 'download_request_success', endpoint: '/vault/access', status: 200, companyId: user.companyId || user.company_id, latencyMs: latency });
            return res.json(result);
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
             const latency = Date.now() - startTimestamp;
             const user = (req as any).user || { id: 'unknown', companyId: 'unknown', storeId: 'unknown' };
             const msg = error?.message || String(error);
             
             // Soft Enforcement Check utilizing Tenant-Aware Circuit Breaker constraints
             if (!VaultCircuitBreaker.isEnforcementEnabledSync(user.company_id || user.companyId)) {
                 emitStructuredLog({ metric: 'shadow_mode_violation_suppressed', error: msg, endpoint: '/vault/access', fileId: req.params.id, userId: user.id, companyId: user.company_id || user.companyId, latencyMs: latency });
                 
                 // TRUE LEGACY EXECUTION FLOW: Bypass Scoped Prisma completely and fetch directly generating identical structure payload
                 try {
                     const unscopedS3LatencyStart = Date.now();
                     const legacyFile = await globalPrisma.vaultFile.findUnique({ where: { id: req.params.id } });
                     if (legacyFile) {
                         const command = new GetObjectCommand({ Bucket: legacyFile.bucket_name, Key: legacyFile.storage_key });
                         const viewUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
                         const totalLatency = Date.now() - unscopedS3LatencyStart;
                         emitMetric({ metric: 'fallback_usage_success', status: 200, endpoint: '/vault/access', companyId: user.company_id || user.companyId, latencyMs: totalLatency });
                         return res.json({ viewUrl, metadata: legacyFile });
                     }
                 } catch (legacyErr: any) {
            if (legacyErr?.name === 'AuthContextMissingError') {
                return res.status(legacyErr.status).json({ error: legacyErr.message });
            }
                     // Failsafe
                 }
             } else {
                 emitStructuredLog({ metric: 'download_request_failure', error: msg, endpoint: '/vault/access', fileId: req.params.id, userId: user.id, status: 500, companyId: user.company_id || user.companyId, latencyMs: latency });
             }

             if (msg.includes('404')) {
                 emitStructuredLog({ metric: 'access_denied_404', fileId: req.params.id, endpoint: '/vault/access', status: 404, userId: user.id, companyId: user.company_id || user.companyId, latencyMs: latency });
                 return res.status(404).json({ error: 'File not found or access denied' });
             }
             if (msg.includes('403')) {
                  emitStructuredLog({ metric: 'access_denied_403', fileId: req.params.id, endpoint: '/vault/access', status: 403, userId: user.id, companyId: user.company_id || user.companyId, latencyMs: latency });
             }
             return res.status(500).json({ error: 'Failed to access document vault', details: msg, stack: error?.stack });
        }
    }
}
