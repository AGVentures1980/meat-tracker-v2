import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../../../src/index'; 
import { getScopedPrisma } from '../../../src/config/scopedPrisma';
import { runAsTenant } from '../../../src/utils/tenantContextRunner';
import { sign } from 'jsonwebtoken';

process.env.ENABLE_VAULT = 'true';
process.env.ENABLE_VAULT_ENFORCEMENT = 'true';

jest.mock('@aws-sdk/client-s3', () => {
    return {
        S3Client: jest.fn().mockImplementation(() => ({})),
        PutObjectCommand: jest.fn(),
        GetObjectCommand: jest.fn()
    };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn<any>().mockResolvedValue('https://fake-s3-url.com/signed')
}));

describe('Vault Multi-Tenant Isolation Suite', () => {
    const JWT_SECRET = process.env.JWT_SECRET || 'brasa-secret-key-change-me';
    
    // Simulating deterministic token issuance for isolation tests
    const tokenStoreA = sign({ id: "uuid-1", role: 'manager', companyId: "10-abc", storeId: 101, scope: { type: 'STORE', storeId: 101 } }, JWT_SECRET);
    const tokenCompanyX = sign({ id: "uuid-3", role: 'admin', companyId: "10-abc", scope: { type: 'COMPANY', companyId: "10-abc" } }, JWT_SECRET);
    const tokenGlobalAdmin = sign({ id: "uuid-8", role: 'admin', isGlobal: true, scope: { type: 'GLOBAL' } }, JWT_SECRET);

    describe('1. Cross-Tenant Download Prevention', () => {
        it('FAIL: Store A requests access to a foreign file UUID', async () => {
             // Simulating guessing a valid UUID belonging to another company
             const foreignFileId = '00000000-0000-0000-0000-000000000000';
             const res = await request(app)
                .get(`/api/v1/vault/access/${foreignFileId}`)
                .set('Authorization', `Bearer ${tokenStoreA}`);
                
             // scopedPrisma should intercept this request and naturally return 404
             if (res.status !== 404) console.log('GET 404 TEST', res.status, res.body);
             expect(res.status).toBe(404);
        });
    });

    describe('2. Namespace Namespace Spoofing (Upload)', () => {
        it('FAIL: Company X attempts to generate upload URL for Company Y store', async () => {
             const res = await request(app)
                .post('/api/v1/vault/request-upload')
                .send({
                    document_type: 'INVOICE',
                    mime_type: 'application/pdf',
                    size_bytes: 1000,
                    original_filename: 'test.pdf',
                    store_id: 9999 // Store not owned by Company X
                })
                .set('Authorization', `Bearer ${tokenCompanyX}`);
             
             expect(res.status).not.toBe(200);
        });
    });

    describe('3. GLOBAL Audit Governance', () => {
        it('FAIL: Global Admin accessing without X-Audit-Reason', async () => {
             const mockFileId = '00000000-0000-0000-0000-000000000000';
             const res = await request(app)
                .get(`/api/v1/vault/access/${mockFileId}`)
                .set('Authorization', `Bearer ${tokenGlobalAdmin}`);
             
             if (res.status !== 403) console.log('GET 403 TEST', res.status, res.body);
             expect(res.status).toBe(403);
             expect(res.body.error).toContain('X-Audit-Reason');
        });
    });

    describe('4. MIME Type Defense', () => {
        it('FAIL: Spoofing unsupported extensions like executable', async () => {
             const res = await request(app)
                .post('/api/v1/vault/request-upload')
                .send({
                    document_type: 'INVOICE',
                    mime_type: 'application/x-msdownload', // .exe
                    size_bytes: 1000,
                    original_filename: 'virus.exe',
                    store_id: 101
                })
                .set('Authorization', `Bearer ${tokenStoreA}`);
             
             expect(res.status).toBe(400);
             expect(res.body.error).toContain('Unsupported MIME type');
        });

        it('FAIL: Max byte size limits (Over 15MB PDF)', async () => {
             const res = await request(app)
                .post('/api/v1/vault/request-upload')
                .send({
                    document_type: 'INVOICE',
                    mime_type: 'application/pdf',
                    size_bytes: 20 * 1024 * 1024, // 20 MB
                    original_filename: 'huge.pdf',
                    store_id: 101
                })
                .set('Authorization', `Bearer ${tokenStoreA}`);
             
             expect(res.status).toBe(400);
             expect(res.body.error).toContain('exceeds');
        });
    });
});
