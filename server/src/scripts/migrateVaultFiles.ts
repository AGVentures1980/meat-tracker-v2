import { PrismaClient } from '@prisma/client';
import { HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../utils/s3Client';
import { StorageKeyBuilder } from '../utils/storageKeyBuilder';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const BUCKET_NAME = process.env.AWS_VAULT_BUCKET_NAME || 'brasa-meat-vault-prod';

/**
 * Enterprise Document Vault - Idempotent Legacy File Migration Pipeline
 * 
 * Target: Scan legacy `Upload` records and transition to secure S3 `VaultFile` paradigm
 * Integrity: Validates existing object existence natively with HeadObject to prevent duplication
 */
async function executeMigration() {
    console.log('[Migration] Initiating Legacy Uploads -> VaultFile S3 Pipeline...');
    
    const legacyUploads = await prisma.upload.findMany({
        where: { processed: true }, // Assumes we only migrate actionable or completed legacy chunks
        include: { store: true }
    });

    console.log(`[Migration] Found ${legacyUploads.length} actionable legacy records.`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const legacy of legacyUploads) {
        const ext = path.extname(legacy.file_url) || '.pdf';
        const mimeType = ext === '.pdf' ? 'application/pdf' : 'image/jpeg';
        
        // Define destination strict key
        const storageKey = StorageKeyBuilder.generateKey(
            legacy.store.company_id, 
            legacy.store_id, 
            legacy.file_type || 'LEGACY_UPLOAD', 
            ext.replace('.', '')
        );

        // --- IDEMPOTENCY CHECK --- //
        try {
            await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: storageKey }));
            console.log(`[Migration] SKIP: S3 Object already exists. Key: ${storageKey}`);
            skipped++;
            
            // Re-sync local state if missing silently
            await syncLocalVaultRecord(legacy, storageKey, mimeType);
            
            continue; 
        } catch (e: any) {
            if (e.name !== 'NotFound' && !e.message.includes('404')) {
                console.error(`[Migration] AWS Check Failure for ${storageKey}:`, e.message);
                failed++;
                continue;
            }
        }

        // --- BINARY TRANSFER --- //
        console.log(`[Migration] Processing buffer transfer for legacy ID: ${legacy.id} -> ${storageKey}`);
        try {
            // For proof-of-concept, we assume legacy files were stored locally
            // In a live system, this might be fetching from a legacy bucket or database base64 blob
            const fullLocalPath = `../legacy_uploads/${legacy.file_url}`;
            if (!fs.existsSync(fullLocalPath)) {
                console.warn(`[Migration] WARN: Local file not found: ${fullLocalPath}`);
                failed++;
                continue;
            }

            const fileBuffer = fs.readFileSync(fullLocalPath);

            await s3Client.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: storageKey,
                Body: fileBuffer,
                ContentType: mimeType
            }));

            // Instantiate valid active VaultFile entity inside Prisma mapping back to the S3 bucket object
            await syncLocalVaultRecord(legacy, storageKey, mimeType);

            migrated++;
        } catch (e: any) {
            console.error(`[Migration] ERROR Migrating ${legacy.id}:`, e.message);
            failed++;
        }
    }

    console.log(`\n[Migration] COMPLETED.\nMigrated: ${migrated}\nSkipped (Idempotent): ${skipped}\nFailed/Lost: ${failed}`);
}

async function syncLocalVaultRecord(legacy: any, storageKey: string, mimeType: string) {
    const exists = await prisma.vaultFile.findFirst({
        where: { storage_key: storageKey }
    });

    if (!exists) {
        await prisma.vaultFile.create({
            data: {
                company_id: legacy.store.company_id,
                store_id: legacy.store_id,
                document_type: legacy.file_type || 'LEGACY_MIGRATION',
                bucket_name: BUCKET_NAME,
                storage_key: storageKey,
                original_filename: legacy.file_url || 'legacy_migration.pdf',
                mime_type: mimeType,
                size_bytes: 0, // Placeholder if unknown without fs stat
                is_active: true,
                upload_status: 'COMPLETED',
                uploaded_by_user_id: 'SYSTEM_MIGRATION' // Override pseudo-user
            }
        });
    }
}

// executeMigration().then(() => process.exit(0)).catch(console.error);
