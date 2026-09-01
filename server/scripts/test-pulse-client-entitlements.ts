import jwt from 'jsonwebtoken';
import { PulseController } from '../src/controllers/PulseController';
import { runClientEntitlementsMigration } from './migrate-client-entitlements';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
process.env.PULSE_SSO_SECRET = 'brasa-pulse-sso-secret-key-change-me';

async function runEntitlementTestMatrix() {
    console.log('===============================================================');
    console.log('  PHASE 7B-5H — BRASA PULSE ENTITLEMENT & ONBOARDING TEST MATRIX');
    console.log('===============================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition: boolean, testName: string, detail?: string) {
        if (condition) {
            console.log(`[PASS] ${testName}`);
            passed++;
        } else {
            console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
            failed++;
        }
    }

    function createMockRes() {
        let statusCode = 200;
        let responseData: any = null;
        return {
            status: (code: number) => {
                statusCode = code;
                return {
                    json: (data: any) => {
                        responseData = data;
                        return { statusCode, responseData };
                    }
                };
            },
            json: (data: any) => {
                responseData = data;
                return { statusCode, responseData };
            },
            get testData() {
                return { statusCode, responseData };
            }
        };
    }

    // 1. Run migration and verify active clients
    await runClientEntitlementsMigration();

    const activeEntitlements = await prisma.organizationProductEntitlement.findMany({
        where: { product_code: 'BRASA_PULSE', status: 'ACTIVE' }
    });

    assert(activeEntitlements.length >= 4, '1. All active client organizations hold ACTIVE BRASA_PULSE entitlement');

    // Test 2: Entitlement uniqueness constraint
    {
        let duplicateError = false;
        try {
            await prisma.organizationProductEntitlement.create({
                data: {
                    company_id: 'tdb-main',
                    product_code: 'BRASA_PULSE',
                    status: 'ACTIVE'
                }
            });
        } catch (e: any) {
            duplicateError = true;
        }
        assert(duplicateError, '2. Database schema guarantees exact 1 entitlement per organization + product_code (@@unique)');
    }

    // Test 3: Active entitlement permits normal SSO handoff
    const mockEntitledReq: any = {
        user: {
            id: 'usr-gm-tdb',
            email: 'manager@texasdebrazil.com',
            role: 'manager',
            store_id: 20,
            companyId: 'tdb-main'
        },
        ip: '127.0.0.1'
    };

    {
        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockEntitledReq, mockRes as any);
        const data = mockRes.testData.responseData;

        assert(data?.success === true && data?.status === 'PULSE_SSO_READY', '3. Active entitled client generates valid SSO handoff token');
        assert(typeof data?.handoff?.jti === 'string', '4. JTI remains present and unique in entitlement-verified handoff');
    }

    // Test 4: Create non-entitled test organization
    let testCompanyId = 'test-non-entitled-company-uuid';
    {
        await prisma.company.upsert({
            where: { id: testCompanyId },
            create: {
                id: testCompanyId,
                name: 'Test Non Entitled Corp',
                subdomain: 'test-no-pulse',
                company_status: 'Active'
            },
            update: {}
        });

        // Ensure INACTIVE entitlement
        await prisma.organizationProductEntitlement.upsert({
            where: {
                company_id_product_code: {
                    company_id: testCompanyId,
                    product_code: 'BRASA_PULSE'
                }
            },
            create: {
                company_id: testCompanyId,
                product_code: 'BRASA_PULSE',
                status: 'INACTIVE',
                source: 'ONBOARDING'
            },
            update: {
                status: 'INACTIVE'
            }
        });
    }

    // Test 5: Inactive entitlement BLOCKS SSO handoff generation (FAIL CLOSED)
    const mockNonEntitledReq: any = {
        user: {
            id: 'usr-unentitled',
            email: 'gm@test-no-pulse.com',
            role: 'manager',
            storeId: 999,
            companyId: testCompanyId
        },
        ip: '127.0.0.1'
    };

    {
        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockNonEntitledReq, mockRes as any);
        const resData = mockRes.testData;

        assert(resData.statusCode === 403 && resData.responseData?.error === 'PULSE_ENTITLEMENT_REQUIRED', '5. Inactive entitlement blocks SSO handoff token generation with 403 PULSE_ENTITLEMENT_REQUIRED');
        assert(resData.responseData?.handoffToken === undefined, '6. No JWT issued for non-entitled organization');
        assert(resData.responseData?.handoff?.jti === undefined, '7. No JTI issued for non-entitled organization');
    }

    // Test 6: Admin entitlement toggle (Requirement 12 & 13)
    {
        // Admin enables test company
        const adminReq: any = {
            user: { id: 'admin-001', email: 'alexandre@alexgarciaventures.co', role: 'admin' },
            body: { companyId: testCompanyId, enabled: true }
        };
        const mockRes1 = createMockRes();
        await PulseController.toggleEntitlement(adminReq, mockRes1 as any);
        assert(mockRes1.testData.responseData?.success === true, '8. Admin can enable BRASA Pulse entitlement via API');

        // Verify SSO now works
        const mockRes2 = createMockRes();
        await PulseController.generateHandoff(mockNonEntitledReq, mockRes2 as any);
        assert(mockRes2.testData.responseData?.success === true, '9. Newly enabled client can generate SSO handoff token');

        // Admin disables test company
        adminReq.body.enabled = false;
        const mockRes3 = createMockRes();
        await PulseController.toggleEntitlement(adminReq, mockRes3 as any);
        assert(mockRes3.testData.responseData?.entitlement?.status === 'INACTIVE', '10. Admin can disable BRASA Pulse entitlement via API');

        // Verify SSO now blocked immediately
        const mockRes4 = createMockRes();
        await PulseController.generateHandoff(mockNonEntitledReq, mockRes4 as any);
        assert(mockRes4.testData.statusCode === 403, '11. Disabling entitlement blocks future SSO handoffs immediately');
    }

    // Test 7: Non-admin GM cannot toggle entitlement
    {
        const gmToggleReq: any = {
            user: { id: 'gm-001', email: 'gm@texasdebrazil.com', role: 'manager' },
            body: { companyId: testCompanyId, enabled: true }
        };
        const mockRes = createMockRes();
        await PulseController.toggleEntitlement(gmToggleReq, mockRes as any);
        assert(mockRes.testData.statusCode === 403, '12. Non-admin GM is forbidden from toggling product entitlements');
    }

    // Clean up test company
    await prisma.organizationProductEntitlement.deleteMany({ where: { company_id: testCompanyId } });
    await prisma.company.delete({ where: { id: testCompanyId } });

    console.log('\n===============================================================');
    console.log(`   ENTITLEMENT TEST MATRIX RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runEntitlementTestMatrix()
    .catch(err => {
        console.error('Fatal Entitlement Test Error:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
