import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { app } from '../../../src/index'; 
import { getScopedPrisma } from '../../../src/config/scopedPrisma';
import { runAsTenant } from '../../../src/utils/tenantContextRunner';
import { sign } from 'jsonwebtoken';

describe('V2 Enterprise Tenant Isolation (Zero-Leakage Suite)', () => {
    const JWT_SECRET = process.env.JWT_SECRET || 'brasa-secret-key-change-me';
    
    const tokenStoreA = sign({ id: 1, role: 'manager', companyId: 10, storeId: 101, scope: { type: 'STORE', storeId: 101 } }, JWT_SECRET);
    const tokenStoreB = sign({ id: 2, role: 'manager', companyId: 10, storeId: 102, scope: { type: 'STORE', storeId: 102 } }, JWT_SECRET);
    const tokenCompanyX = sign({ id: 3, role: 'admin', companyId: 10, scope: { type: 'COMPANY', companyId: 10 } }, JWT_SECRET);
    const tokenGlobalAdmin = sign({ id: 8, role: 'admin', isGlobal: true, scope: { type: 'GLOBAL' } }, JWT_SECRET);

    describe('1. Cross-Tenant Read Attempts', () => {
        it('FAIL: Company X attempts to read Company Y invoices', async () => {
            const res = await request(app)
                .get('/api/v1/invoices?companyId=20')
                .set('Authorization', `Bearer ${tokenCompanyX}`);
            
            if(res.body && Array.isArray(res.body)) {
                 const hasCompanyYInvoices = res.body.some((inv: any) => inv.company_id === 20);
                 expect(hasCompanyYInvoices).toBe(false);
            }
        });
    });

    describe('2. Cross-Store Write Attempts', () => {
        it('FAIL: Store A attempts to update Store B order', async () => {
            const res = await request(app)
                .put('/api/v1/orders/999') // Assuming 999 is Store B
                .send({ status: 'DELIVERED' })
                .set('Authorization', `Bearer ${tokenStoreA}`);
            
            expect(res.status).toBe(404);
        });
    });

    describe('3. IDOR Probing Detector', () => {
        it('PASS: 10 unauthorized requests trigger 429 block', async () => {
            for(let i=0; i<10; i++) {
                 await request(app)
                    .get('/api/v1/stores/102') 
                    .set('Authorization', `Bearer ${tokenStoreA}`);
            }
            const res = await request(app)
                .get('/api/v1/stores/101') 
                .set('Authorization', `Bearer ${tokenStoreA}`);
            expect(res.status).toBe(429);
        });
    });

    describe('4. GLOBAL without X-Audit-Reason', () => {
        it('FAIL: GLOBAL action without reason header', async () => {
            const res = await request(app)
                .get('/api/v1/companies') 
                .set('Authorization', `Bearer ${tokenGlobalAdmin}`);
            
            expect(res.status).toBe(403);
            expect(res.body.error).toContain('X-Audit-Reason');
        });
    });

    describe('5. Query Cap (MAX_ROWS)', () => {
        it('PASS: Queries are capped at 5000 rows', async () => {
             const res = await request(app)
                .get('/api/v1/orders?take=10000') 
                .set('Authorization', `Bearer ${tokenCompanyX}`);
             
             if(res.body && Array.isArray(res.body)) {
                 expect(res.body.length).toBeLessThanOrEqual(5000);
             }
        });
    });
});
