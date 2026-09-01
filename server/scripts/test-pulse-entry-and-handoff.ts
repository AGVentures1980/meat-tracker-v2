import jwt from 'jsonwebtoken';
import { PulseController } from '../src/controllers/PulseController';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
process.env.PULSE_SSO_SECRET = 'brasa-pulse-sso-secret-key-change-me';

async function runPulseEntryAndHandoffTests() {
    console.log('===============================================================');
    console.log('  PHASE 7B-5G — PULSE ENTRY & LIVE SSO HANDOFF TEST MATRIX     ');
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

    const mockGmReq: any = {
        user: {
            id: 'usr-gm-store20',
            email: 'gm.tampa@texasdebrazil.com',
            role: 'manager',
            store_id: 20,
            companyId: 'tdb-main'
        },
        ip: '127.0.0.1'
    };

    const mockAreaReq: any = {
        user: {
            id: 'usr-area-mgr',
            email: 'area.director@texasdebrazil.com',
            role: 'area_manager',
            companyId: 'tdb-main',
            scope: { type: 'AREA', storeIds: ['20', '776'] }
        },
        ip: '127.0.0.1'
    };

    // Test 1: Authorized GM receives PULSE_SSO_READY and fullRedirectUrl
    {
        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockGmReq, mockRes as any);
        const data = mockRes.testData.responseData;

        assert(data && data.success === true, '1. Live handoff succeeds for authorized GM');
        assert(data?.status === 'PULSE_SSO_READY', '2. Obsolete PULSE_SSO_NOT_CONNECTED no longer blocks flow (returns PULSE_SSO_READY)');
        assert(typeof data?.fullRedirectUrl === 'string' && data.fullRedirectUrl.includes('/api/auth/brasa-meat-sso?token='), '3. fullRedirectUrl targets receiver SSO endpoint /api/auth/brasa-meat-sso');
    }

    // Test 2: Development destination defaults to http://localhost:3001
    {
        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockGmReq, mockRes as any);
        const data = mockRes.testData.responseData;

        assert(data?.destinationUrl === 'http://localhost:3001', '4. Development destinationUrl defaults to http://localhost:3001');
        assert(data?.fullRedirectUrl?.startsWith('http://localhost:3001/api/auth/brasa-meat-sso'), '5. Development fullRedirectUrl uses http://localhost:3001 in dev');
    }

    // Test 3: Environment variable PULSE_BASE_URL override works
    {
        process.env.PULSE_BASE_URL = 'https://pulse.brasameat.com';
        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockGmReq, mockRes as any);
        const data = mockRes.testData.responseData;

        assert(data?.destinationUrl === 'https://pulse.brasameat.com', '6. Custom PULSE_BASE_URL configuration supported (https://pulse.brasameat.com)');
        assert(data?.fullRedirectUrl?.startsWith('https://pulse.brasameat.com/api/auth/brasa-meat-sso'), '7. Production fullRedirectUrl matches PULSE_BASE_URL');

        delete process.env.PULSE_BASE_URL;
    }

    // Test 4: JTI is generated and present
    {
        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockGmReq, mockRes as any);
        const data = mockRes.testData.responseData;
        const decoded: any = jwt.decode(data.handoffToken);

        assert(data?.handoff?.jti !== undefined && data.handoff.jti.length > 10, '8. JTI generated server-side and present in handoff response');
        assert(decoded?.jti === data?.handoff?.jti, '9. JTI present inside JWT claim payload');
    }

    // Test 5: Multi-location manager handoff
    {
        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockAreaReq, mockRes as any);
        const data = mockRes.testData.responseData;
        const decoded: any = jwt.decode(data.handoffToken);

        assert(decoded?.allowedLocationIds?.length === 2, '10. Multi-location user scope correctly carried in live handoff (2 stores)');
    }

    // Test 6: Unauthorized / missing session user
    {
        const mockUnauthReq: any = { user: null };
        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockUnauthReq, mockRes as any);
        const resData = mockRes.testData;

        assert(resData.statusCode === 401, '11. Unauthorized user denied with 401');
    }

    // Test 7: Security Hygiene - No raw token logged, no password in token
    {
        const mockRes = createMockRes();
        await PulseController.generateHandoff(mockGmReq, mockRes as any);
        const decoded: any = jwt.decode(mockRes.testData.responseData?.handoffToken);

        assert(decoded?.password === undefined, '12. Password NOT included in handoff token');
    }

    console.log('\n===============================================================');
    console.log(`   PULSE ENTRY & SSO TEST MATRIX RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runPulseEntryAndHandoffTests()
    .catch(err => {
        console.error('Fatal Test Error:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
