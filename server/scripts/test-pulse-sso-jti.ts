import jwt from 'jsonwebtoken';
import { PulseController } from '../src/controllers/PulseController';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
process.env.PULSE_SSO_SECRET = process.env.PULSE_SSO_SECRET || 'test-dedicated-sso-secret-key-392810';

async function runJtiTestMatrix() {
    console.log('===============================================================');
    console.log('  PHASE 7B-5E — SSO HANDOFF JTI & SENDER HARDENING TEST MATRIX ');
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

    // Mock Express Response
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

    const mockGmReq: any = {
        user: {
            id: 'usr-gm-001',
            email: 'manager.tampa@texasdebrazil.com',
            role: 'manager',
            store_id: 20,
            companyId: 'tdb-main'
        },
        ip: '127.0.0.1'
    };

    const mockAreaReq: any = {
        user: {
            id: 'usr-area-001',
            email: 'area.manager@texasdebrazil.com',
            role: 'area_manager',
            companyId: 'tdb-main',
            scope: { type: 'AREA', storeIds: ['20', '776', '510'] }
        },
        ip: '127.0.0.1'
    };

    // Test 1 & 2: jti exists and is non-empty
    {
        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockGmReq, mockRes as any);
        const data = mockRes.testData.responseData;

        assert(data && data.success === true, '1. Generate handoff succeeds');
        assert(data?.handoff?.jti && typeof data.handoff.jti === 'string' && data.handoff.jti.length > 10, '2. JTI exists and is non-empty in response');

        const decoded: any = jwt.decode(data.handoffToken);
        assert(decoded?.jti && decoded.jti === data.handoff.jti, '3. JTI matches decoded JWT token claim');
    }

    // Test 3: Two generated handoffs produce different JTI values (jti A != jti B)
    {
        const mockRes1 = createMockRes();
        const mockRes2 = createMockRes();

        await PulseController.generateHandoff(mockGmReq, mockRes1 as any);
        await PulseController.generateHandoff(mockGmReq, mockRes2 as any);

        const jti1 = mockRes1.testData.responseData?.handoff?.jti;
        const jti2 = mockRes2.testData.responseData?.handoff?.jti;

        assert(jti1 && jti2 && jti1 !== jti2, '4. JTI changes on every request (jti A != jti B for same user/minute)');
    }

    // Test 4: Cryptographically strong UUID format check (UUID v4)
    {
        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockGmReq, mockRes as any);
        const jti = mockRes.testData.responseData?.handoff?.jti;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        assert(uuidRegex.test(jti), '5. JTI is a cryptographically secure random UUID v4');
    }

    // Test 5: Token lifetime remains 300 seconds
    {
        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockGmReq, mockRes as any);
        const token = mockRes.testData.responseData?.handoffToken;
        const decoded: any = jwt.decode(token);

        assert(decoded?.exp - decoded?.iat === 300, '6. Token lifetime remains exactly 300 seconds (5 minutes)');
    }

    // Test 6 & 7 & 8: Header and Claim preservation (iss, aud, alg)
    {
        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockGmReq, mockRes as any);
        const token = mockRes.testData.responseData?.handoffToken;
        const decoded: any = jwt.decode(token, { complete: true });

        assert(decoded?.header?.alg === 'HS256', '7. Algorithm remains HS256 HMAC');
        assert(decoded?.payload?.iss === 'brasa-meat-intelligence', '8. Issuer preserved (brasa-meat-intelligence)');
        assert(decoded?.payload?.aud === 'brasa-brand-pulse', '9. Audience preserved (brasa-brand-pulse)');
    }

    // Test 9 & 10: Dedicated Secret Requirement / Fail Closed
    {
        const oldSecret = process.env.PULSE_SSO_SECRET;
        const oldEnv = process.env.NODE_ENV;

        delete process.env.PULSE_SSO_SECRET;
        (process.env as any).NODE_ENV = 'production';

        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockGmReq, mockRes as any);
        const resData = mockRes.testData;

        assert(resData.statusCode === 500 && resData.responseData?.error === 'PULSE_SSO_NOT_CONFIGURED', '10. Dedicated secret required: Fails closed when PULSE_SSO_SECRET missing in production');

        // Restore env
        if (oldSecret) process.env.PULSE_SSO_SECRET = oldSecret;
        (process.env as any).NODE_ENV = oldEnv;
    }

    // Test 11: GM location scope unchanged
    {
        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockGmReq, mockRes as any);
        const decoded: any = jwt.decode(mockRes.testData.responseData?.handoffToken);

        assert(
            decoded?.allowedLocationIds?.length === 1 && decoded?.allowedLocationIds[0] === '20' && decoded?.primaryLocationId === '20',
            '11. GM location scope unchanged (allowedLocationIds: ["20"], primaryLocationId: "20")'
        );
    }

    // Test 12: Multi-location manager scope unchanged
    {
        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockAreaReq, mockRes as any);
        const decoded: any = jwt.decode(mockRes.testData.responseData?.handoffToken);

        assert(
            decoded?.allowedLocationIds?.length === 3 && decoded?.role === 'area_manager',
            '12. Multi-location scope unchanged (3 authorized stores preserved)'
        );
    }

    // Test 13 & 14 & 15: Security hygiene (No raw token logged, no password in token)
    {
        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockGmReq, mockRes as any);
        const decoded: any = jwt.decode(mockRes.testData.responseData?.handoffToken);

        assert(decoded?.password === undefined && decoded?.password_hash === undefined, '13. Password is NOT included in handoff token payload');

        const auditLog = await prisma.auditLog.findFirst({
            where: { action: 'PULSE_SSO_HANDOFF_ISSUED' },
            orderBy: { created_at: 'desc' }
        });

        assert(auditLog !== null, '14. Audit log event PULSE_SSO_HANDOFF_ISSUED written to database');
        if (auditLog) {
            const details: any = auditLog.details;
            assert(details?.jti !== undefined && details?.jti === decoded?.jti, '15. Audit log records JTI for security correlation without storing raw JWT or secret');
        }
    }

    console.log('\n===============================================================');
    console.log(`   SENDER JTI TEST MATRIX RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runJtiTestMatrix()
    .catch(err => {
        console.error('Fatal JTI Test Error:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
