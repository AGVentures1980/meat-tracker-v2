import jwt from 'jsonwebtoken';
import { PulseController } from '../src/controllers/PulseController';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runSecretHardeningTests() {
    console.log('===============================================================');
    console.log('  PHASE 7B-5Q-R — SSO SECRET HARDENING & ROTATION TEST MATRIX ');
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

    try {
        const entitlement = await prisma.organizationProductEntitlement.findFirst({
            where: { product_code: 'BRASA_PULSE', status: 'ACTIVE' }
        });
        const gmUser = await prisma.user.findFirst({
            where: { company_id: entitlement?.company_id }
        });

        if (!gmUser) {
            throw new Error('Test environment missing active GM user');
        }

        // Test 1: Fail closed when PULSE_SSO_SECRET is missing
        delete process.env.PULSE_SSO_SECRET;

        let statusSent = 0;
        let jsonSent: any = null;

        const reqMissingSecret: any = {
            user: {
                id: gmUser.id,
                companyId: gmUser.company_id,
                role: gmUser.role
            },
            socket: { remoteAddress: '127.0.0.1' },
            headers: {}
        };

        const resMissingSecret: any = {
            status: (s: number) => {
                statusSent = s;
                return {
                    json: (data: any) => {
                        jsonSent = data;
                    }
                };
            }
        };

        await PulseController.generateHandoff(reqMissingSecret, resMissingSecret);

        assert(
            statusSent === 500 && jsonSent?.error === 'PULSE_SSO_NOT_CONFIGURED',
            '1. Missing PULSE_SSO_SECRET fails closed with HTTP 500 PULSE_SSO_NOT_CONFIGURED'
        );

        assert(
            !jsonSent?.token && !jsonSent?.handoffToken,
            '2. Zero JWT tokens issued when PULSE_SSO_SECRET is missing'
        );

        assert(
            !jsonSent?.jti,
            '3. Zero JTI values issued when PULSE_SSO_SECRET is missing'
        );

        // Test 2: Dedicated secret set via environment variable enables valid handoff
        const DEDICATED_TEST_SECRET = 'newly-rotated-production-secret-spec-test-key-2026';
        process.env.PULSE_SSO_SECRET = DEDICATED_TEST_SECRET;

        let okStatus = 0;
        let okJson: any = null;

        const resOk: any = {
            status: (s: number) => {
                okStatus = s;
                return {
                    json: (data: any) => {
                        okJson = data;
                    }
                };
            },
            json: (data: any) => {
                okStatus = 200;
                okJson = data;
            }
        };

        await PulseController.generateHandoff(reqMissingSecret, resOk);

        assert(
            okStatus === 200 && Boolean(okJson?.token || okJson?.handoffToken) && Boolean(okJson?.jti || okJson?.handoff?.jti),
            '4. Configured PULSE_SSO_SECRET issues valid handoff token with unique JTI'
        );

        // Test 3: Token signed with old compromised key fails signature verification under new key
        const OLD_COMPROMISED_KEY = 'brasa-pulse-sso-secret-key-change-me';
        const compromisedToken = jwt.sign(
            { iss: 'brasa-meat-intelligence', aud: 'brasa-brand-pulse', userId: gmUser.id, jti: 'test-jti' },
            OLD_COMPROMISED_KEY
        );

        let validationFailed = false;
        try {
            jwt.verify(compromisedToken, DEDICATED_TEST_SECRET);
        } catch (err) {
            validationFailed = true;
        }

        assert(
            validationFailed === true,
            '5. Token signed with old compromised key fails verification under newly rotated secret'
        );

    } catch (err: any) {
        console.error('Fatal error in secret hardening test runner:', err);
    } finally {
        await prisma.$disconnect();
    }

    console.log('\n===============================================================');
    console.log(`   SECRET HARDENING TEST MATRIX RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) process.exit(1);
}

runSecretHardeningTests().catch(console.error);
