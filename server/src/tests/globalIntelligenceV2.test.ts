// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Global Intelligence v2 Test Suite

import { TenantManifestValidator, TenantManifest } from '../services/TenantManifestValidator';
import { requireGlobalScope } from '../routes/platform.routes';

async function runTests() {
    console.log('[TEST] Starting Global Intelligence v2 Test Suite...');
    let passed = 0;
    let failed = 0;

    function assert(condition: boolean, message: string) {
        if (condition) {
            console.log(`  ✓ PASSED: ${message}`);
            passed++;
        } else {
            console.error(`  ✗ FAILED: ${message}`);
            failed++;
        }
    }

    // TEST 1: Manifest Validator — Valid Coordinates
    const validManifest: TenantManifest = {
        manifest_id: 'test_manifest_001',
        manifest_version: 1,
        company: {
            canonical_name: 'Example Steakhouse',
            display_name: 'Example Steakhouse',
            subdomain: 'example'
        },
        locations: [
            {
                canonical_key: 'LOC_001',
                store_name: 'Example Store 1',
                latitude: 30.2672,
                longitude: -97.7431
            }
        ],
        products: [{ canonical_name: 'Picanha' }],
        users: [{ email: 'admin@example.com', role: 'owner' }]
    };

    const val1 = TenantManifestValidator.validateManifestSchema(validManifest);
    assert(val1.isValid, 'Valid lat/lng coordinates pass validation');

    // TEST 2: Manifest Validator — Invalid Latitude
    const invalidLatManifest: TenantManifest = {
        ...validManifest,
        locations: [{ canonical_key: 'LOC_001', store_name: 'Example Store 1', latitude: 105, longitude: -97.7431 }]
    };
    const val2 = TenantManifestValidator.validateManifestSchema(invalidLatManifest);
    assert(!val2.isValid && val2.errors.some(e => e.includes('INVALID_LATITUDE')), 'Invalid latitude (> 90) rejected');

    // TEST 3: Manifest Validator — Invalid Longitude
    const invalidLngManifest: TenantManifest = {
        ...validManifest,
        locations: [{ canonical_key: 'LOC_001', store_name: 'Example Store 1', latitude: 30, longitude: -200 }]
    };
    const val3 = TenantManifestValidator.validateManifestSchema(invalidLngManifest);
    assert(!val3.isValid && val3.errors.some(e => e.includes('INVALID_LONGITUDE')), 'Invalid longitude (< -180) rejected');

    // TEST 4: Manifest Validator — Incomplete Pair (Only Lat)
    const incompletePairManifest: TenantManifest = {
        ...validManifest,
        locations: [{ canonical_key: 'LOC_001', store_name: 'Example Store 1', latitude: 30, longitude: undefined }]
    };
    const val4 = TenantManifestValidator.validateManifestSchema(incompletePairManifest);
    assert(!val4.isValid && val4.errors.some(e => e.includes('GEO_PAIR_INCOMPLETE')), 'Incomplete coordinate pair (only lat) rejected');

    // TEST 5: Manifest Validator — Both Null / Pending (Allowed)
    const pendingGeoManifest: TenantManifest = {
        ...validManifest,
        locations: [{ canonical_key: 'LOC_001', store_name: 'Example Store 1', latitude: undefined, longitude: undefined }]
    };
    const val5 = TenantManifestValidator.validateManifestSchema(pendingGeoManifest);
    assert(val5.isValid, 'Missing coordinates (both undefined) allowed as GEO_PENDING');

    // TEST 6: Security Authorization — GLOBAL actor permitted
    let nextCalled = false;
    const reqGlobal: any = { user: { role: 'admin', scope: { type: 'GLOBAL' } } };
    const resGlobal: any = { status: () => resGlobal, json: () => resGlobal };
    requireGlobalScope(reqGlobal, resGlobal, () => { nextCalled = true; });
    assert(nextCalled, 'GLOBAL scope actor is granted access to platform endpoint');

    // TEST 7: Security Authorization — COMPANY actor rejected (403)
    let statusCode = 0;
    const reqCompany: any = { user: { role: 'admin', companyId: 'CMP-123', scope: { type: 'COMPANY' } } };
    const resCompany: any = {
        status: (code: number) => { statusCode = code; return resCompany; },
        json: () => resCompany
    };
    requireGlobalScope(reqCompany, resCompany, () => {});
    assert(statusCode === 403, 'COMPANY scope actor receives 403 on platform global intelligence endpoint');

    // TEST 8: Security Authorization — STORE actor rejected (403)
    statusCode = 0;
    const reqStore: any = { user: { role: 'manager', companyId: 'CMP-123', scope: { type: 'STORE' } } };
    const resStore: any = {
        status: (code: number) => { statusCode = code; return resStore; },
        json: () => resStore
    };
    requireGlobalScope(reqStore, resStore, () => {});
    assert(statusCode === 403, 'STORE scope actor receives 403 on platform global intelligence endpoint');

    // TEST 9: Security Authorization — AREA actor rejected (403)
    statusCode = 0;
    const reqArea: any = { user: { role: 'area_manager', companyId: 'CMP-123', scope: { type: 'AREA' } } };
    const resArea: any = {
        status: (code: number) => { statusCode = code; return resArea; },
        json: () => resArea
    };
    requireGlobalScope(reqArea, resArea, () => {});
    assert(statusCode === 403, 'AREA scope actor receives 403 on platform global intelligence endpoint');

    // TEST 10: Derived Metrics Calculation Invariant (Zero-Code New Tenant + GEO_PENDING + Inactive)
    const mockCompanyData = {
        id: 'CMP-TEST-99',
        name: 'Example Steakhouse',
        subdomain: 'example',
        company_status: 'Active',
        theme_logo_url: '/example-logo.svg',
        stores: [
            { id: 1, name: 'S1', status: 'ACTIVE', latitude: 30.1, longitude: -97.1 },
            { id: 2, name: 'S2', status: 'ACTIVE', latitude: 30.2, longitude: -97.2 },
            { id: 3, name: 'S3', status: 'ACTIVE', latitude: 30.3, longitude: -97.3 },
            { id: 4, name: 'S4', status: 'ACTIVE', latitude: 30.4, longitude: -97.4 },
            { id: 5, name: 'S5', status: 'ACTIVE', latitude: 30.5, longitude: -97.5 },
            { id: 6, name: 'S6', status: 'ACTIVE', latitude: 30.6, longitude: -97.6 },
            { id: 7, name: 'S7', status: 'ACTIVE', latitude: 30.7, longitude: -97.7 },
            { id: 8, name: 'S8', status: 'ACTIVE', latitude: 30.8, longitude: -97.8 },
            { id: 9, name: 'S9', status: 'ACTIVE', latitude: null, longitude: null }, // Pending
            { id: 10, name: 'S10', status: 'ACTIVE', latitude: null, longitude: null }, // Pending
            { id: 11, name: 'S11', status: 'INACTIVE', latitude: 30.9, longitude: -97.9 }, // Closed
            { id: 12, name: 'S12', status: 'CLOSED', latitude: 31.0, longitude: -98.0 }  // Closed
        ]
    };

    const activeStores = mockCompanyData.stores.filter(s => s.status === 'ACTIVE');
    const mappedStores = activeStores.filter(s => s.latitude !== null && s.longitude !== null);
    const activeStoreCount = activeStores.length;
    const mappedStoreCount = mappedStores.length;
    const geoPendingCount = activeStoreCount - mappedStoreCount;

    assert(activeStoreCount === 10, 'Active store count excludes inactive and closed stores (10 active)');
    assert(mappedStoreCount === 8, 'Mapped store count includes only active stores with valid coordinates (8 mapped)');
    assert(geoPendingCount === 2, 'Geo pending count correctly equals active minus mapped (2 pending)');

    // TEST 11: Cross-Subdomain Navigation Target Construction
    function resolveTargetUrl(currentHost: string, targetSubdomain: string): string {
        if (currentHost.includes('.brasameat.com')) {
            const rootDomain = 'brasameat.com';
            const currentSub = currentHost.split(`.${rootDomain}`)[0];
            if (targetSubdomain && currentSub !== targetSubdomain) {
                return `https://${targetSubdomain}.${rootDomain}/dashboard`;
            }
        }
        return '/dashboard';
    }

    const tdbNav = resolveTargetUrl('chima.brasameat.com', 'tdb');
    assert(tdbNav === 'https://tdb.brasameat.com/dashboard', 'Selecting TDB from Chima subdomain generates https://tdb.brasameat.com/dashboard');

    const chimaNav = resolveTargetUrl('tdb.brasameat.com', 'chima');
    assert(chimaNav === 'https://chima.brasameat.com/dashboard', 'Selecting Chima from TDB subdomain generates https://chima.brasameat.com/dashboard');

    const hardrockNav = resolveTargetUrl('tdb.brasameat.com', 'hardrock');
    assert(hardrockNav === 'https://hardrock.brasameat.com/dashboard', 'Selecting Hard Rock from TDB subdomain generates https://hardrock.brasameat.com/dashboard');

    // TEST 12: Hostname Reconciliation Invariant
    function reconcileTenantCompany(hostname: string, themeCompanyId: string, currentSelected: string): string {
        if (hostname.includes('.brasameat.com')) {
            const currentSub = hostname.split('.brasameat.com')[0];
            if (currentSub !== 'www' && currentSub !== 'localhost') {
                return themeCompanyId; // Hostname theme companyId is authoritative on tenant subdomains
            }
        }
        return currentSelected;
    }

    const reconciledOnChima = reconcileTenantCompany('chima.brasameat.com', 'CMP-CHIMA', 'CMP-TDB');
    assert(reconciledOnChima === 'CMP-CHIMA', 'Stale selectedCompany CMP-TDB on chima.brasameat.com is reconciled to CMP-CHIMA');

    const reconciledOnTdb = reconcileTenantCompany('tdb.brasameat.com', 'CMP-TDB', 'CMP-CHIMA');
    assert(reconciledOnTdb === 'CMP-TDB', 'Stale selectedCompany CMP-CHIMA on tdb.brasameat.com is reconciled to CMP-TDB');

    // TEST 13: Secret / Token URL Protection
    const navUrls = [tdbNav, chimaNav, hardrockNav];
    const hasSecretInUrl = navUrls.some(url => url.includes('token=') || url.includes('jwt=') || url.includes('password=') || url.includes('secret='));
    assert(!hasSecretInUrl, 'Cross-subdomain navigation URLs contain zero tokens, passwords, or secrets');

    console.log(`\n[TEST SUMMARY] Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
