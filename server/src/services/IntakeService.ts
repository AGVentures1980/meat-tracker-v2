import { PrismaClient, Prisma } from '@prisma/client';
import { generateFingerprint } from '../utils/cryptoUtils';
import { CanonicalizerEngine } from '../utils/CanonicalizerEngine';
import { OutboxService } from './OutboxService';
import { FileSecurity } from '../utils/fileSecurity';
import crypto from 'crypto';

const prisma = new PrismaClient();

export type TenantContext = {
  tenant_id: string;
  store_id?: number | null;
  scope_level: 'TENANT' | 'STORE';
  actor_user_id: string;
  actor_role: string;
  correlation_id: string;
};

export class IntakeService {
    
    private static createStandardAuditLog(ctx: TenantContext, source_type: string, fingerprint: string) {
        return {
            correlation_id: ctx.correlation_id,
            actor_user_id: ctx.actor_user_id,
            actor_role: ctx.actor_role,
            action: 'VALIDATION_ITEM_QUEUED',
            target_resource: source_type,
            effective_scope: ctx.scope_level === 'STORE' ? `${ctx.tenant_id}:${ctx.store_id}` : ctx.tenant_id,
            fingerprint,
            result_status: 'QUEUED'
        };
    }

    static async processBarcode(ctx: TenantContext, raw_input: string, expected_output: any, validation_notes: string, priority: string) {
        const canonical = CanonicalizerEngine.resolve('barcode', raw_input);
        const fingerprint = generateFingerprint('barcode', ctx.tenant_id, ctx.store_id || undefined, canonical);
        const idempotency_key = `outbox_${fingerprint}`;

        return await prisma.$transaction(async (tx) => {
            const item = await tx.goldenDatasetItem.create({
                data: {
                    tenant_id: ctx.tenant_id,
                    store_id: ctx.store_id,
                    scope_level: ctx.scope_level,
                    source_type: 'barcode',
                    raw_input,
                    canonical_input: canonical,
                    fingerprint,
                    correlation_id: ctx.correlation_id,
                    expected_output,
                    validation_notes,
                    priority: priority || 'NORMAL',
                    status: 'QUEUED'
                }
            });
            await OutboxService.enqueueItem(tx, item.id, ctx.tenant_id, idempotency_key);
            await tx.intakeAudit.create({ data: IntakeService.createStandardAuditLog(ctx, 'barcode', fingerprint) });
            return item;
        });
    }

    static async processOlo(ctx: TenantContext, raw_input: any, expected_output: any, validation_notes: string, priority: string) {
        const strInput = typeof raw_input === 'string' ? raw_input : JSON.stringify(raw_input);
        const canonical = CanonicalizerEngine.resolve('olo', strInput);
        const fingerprint = generateFingerprint('olo', ctx.tenant_id, ctx.store_id || undefined, canonical);
        const idempotency_key = `outbox_${fingerprint}`;

        return await prisma.$transaction(async (tx) => {
            const item = await tx.goldenDatasetItem.create({
                data: {
                    tenant_id: ctx.tenant_id,
                    store_id: ctx.store_id,
                    scope_level: ctx.scope_level,
                    source_type: 'olo',
                    raw_input: strInput,
                    canonical_input: canonical,
                    fingerprint,
                    correlation_id: ctx.correlation_id,
                    expected_output,
                    validation_notes,
                    priority: priority || 'NORMAL',
                    status: 'QUEUED'
                }
            });
            await OutboxService.enqueueItem(tx, item.id, ctx.tenant_id, idempotency_key);
            await tx.intakeAudit.create({ data: IntakeService.createStandardAuditLog(ctx, 'olo', fingerprint) });
            return item;
        });
    }

    static async processInvoice(ctx: TenantContext, file_name: string, file_bytes: number, mime_type: string, extracted_text: string, expected_output: any, validation_notes: string, priority: string) {
        FileSecurity.validate(mime_type, file_bytes);

        const strInput = `[FILE: ${file_name}] ${extracted_text}`;
        const canonical = CanonicalizerEngine.resolve('invoice', strInput);
        const fingerprint = generateFingerprint('invoice', ctx.tenant_id, ctx.store_id || undefined, canonical);
        const fileChecksum = crypto.createHash('sha256').update(strInput).digest('hex');
        const idempotency_key = `outbox_${fingerprint}`;

        return await prisma.$transaction(async (tx) => {
            const fo = await tx.fileObject.create({
                data: {
                    tenant_id: ctx.tenant_id,
                    storage_key: `s3://mock-${ctx.tenant_id}/${ctx.correlation_id}.pdf`,
                    original_name: file_name,
                    mime_type,
                    size_bytes: file_bytes,
                    checksum: fileChecksum,
                    malware_scan_status: 'PENDING'
                }
            });

            const item = await tx.goldenDatasetItem.create({
                data: {
                    tenant_id: ctx.tenant_id,
                    store_id: ctx.store_id,
                    scope_level: ctx.scope_level,
                    source_type: 'invoice',
                    raw_input: strInput,
                    canonical_input: canonical,
                    fingerprint,
                    correlation_id: ctx.correlation_id,
                    expected_output,
                    validation_notes,
                    priority: priority || 'NORMAL',
                    status: 'QUEUED'
                }
            });

            await tx.fileObject.update({ where: { id: fo.id }, data: { dataset_item_id: item.id } });
            await OutboxService.enqueueItem(tx, item.id, ctx.tenant_id, idempotency_key);
            await tx.intakeAudit.create({ data: IntakeService.createStandardAuditLog(ctx, 'invoice', fingerprint) });
            return item;
        });
    }

    static async processImage(ctx: TenantContext, image_base64: string, expected_output: any, validation_notes: string, priority: string, mime_type: string = 'image/jpeg') {
        const size_bytes = image_base64 ? Buffer.from(image_base64, 'base64').length : 0;
        FileSecurity.validate(mime_type, size_bytes);

        const strInput = `[IMAGE LOG] Length: ${size_bytes}`;
        const canonical = CanonicalizerEngine.resolve('image', strInput);
        const fingerprint = generateFingerprint('image', ctx.tenant_id, ctx.store_id || undefined, canonical);
        const fileChecksum = crypto.createHash('sha256').update(image_base64 || '').digest('hex');
        const idempotency_key = `outbox_${fingerprint}`;

        return await prisma.$transaction(async (tx) => {
            const fo = await tx.fileObject.create({
                data: {
                    tenant_id: ctx.tenant_id,
                    storage_key: `s3://mock-${ctx.tenant_id}/${ctx.correlation_id}.jpg`,
                    original_name: "uploaded_image",
                    mime_type,
                    size_bytes,
                    checksum: fileChecksum,
                    malware_scan_status: 'PENDING'
                }
            });

            const item = await tx.goldenDatasetItem.create({
                data: {
                    tenant_id: ctx.tenant_id,
                    store_id: ctx.store_id,
                    scope_level: ctx.scope_level,
                    source_type: 'image',
                    raw_input: strInput,
                    canonical_input: canonical,
                    fingerprint,
                    correlation_id: ctx.correlation_id,
                    expected_output,
                    validation_notes,
                    priority: priority || 'NORMAL',
                    status: 'QUEUED'
                }
            });

            await tx.fileObject.update({ where: { id: fo.id }, data: { dataset_item_id: item.id } });
            await OutboxService.enqueueItem(tx, item.id, ctx.tenant_id, idempotency_key);
            await tx.intakeAudit.create({ data: IntakeService.createStandardAuditLog(ctx, 'image', fingerprint) });
            return item;
        });
    }

    static async reprocessItem(ctx: TenantContext, item_id: string) {
        // Enforces Tenant Level Boundary check inherently
        const item = await prisma.goldenDatasetItem.findUnique({ where: { id: item_id } });
        if (!item || item.tenant_id !== ctx.tenant_id) {
            throw new Error(`403: Cross-Tenant or Missing Reprocess Target`);
        }

        const idempotency_key = `outbox_reprocess_${item.id}_${Date.now()}`;

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.goldenDatasetItem.update({
                where: { id: item.id },
                data: {
                    status: 'QUEUED',
                    retry_count: { increment: 1 },
                    quarantine_cause: null,
                    quarantine_details: Prisma.DbNull,
                    parsed_output: Prisma.DbNull,
                    normalized_output: Prisma.DbNull,
                    validation_output: Prisma.DbNull
                }
            });
            await OutboxService.enqueueItem(tx, item.id, ctx.tenant_id, idempotency_key);
            await tx.intakeAudit.create({
                data: {
                    ...IntakeService.createStandardAuditLog(ctx, item.source_type, item.fingerprint),
                    action: 'VALIDATION_ITEM_REPROCESSED'
                }
            });
            return updated;
        });
    }

    static async logDuplicateQuarantine(ctx: TenantContext, source_type: string) {
        try {
            await prisma.intakeAudit.create({
                data: {
                    correlation_id: `${ctx.correlation_id}_DUP`,
                    actor_user_id: ctx.actor_user_id,
                    actor_role: ctx.actor_role,
                    action: 'INTAKE_DUPLICATE_REJECTED',
                    target_resource: source_type,
                    effective_scope: ctx.scope_level === 'STORE' ? `${ctx.tenant_id}:${ctx.store_id}` : ctx.tenant_id,
                    fingerprint: 'KNOWN_DUPLICATE_DROP',
                    result_status: 'QUARANTINED'
                }
            });
        } catch (e) {
            // Failsafe inside fail logger
            console.error(e);
        }
    }
}
