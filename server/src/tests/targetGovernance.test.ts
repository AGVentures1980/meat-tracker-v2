// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Target Governance & Taxonomy Automated Test Suite (Expanded Hardening v2)

import { PrismaClient } from '@prisma/client';
import { TargetGovernanceEngine } from '../services/TargetGovernanceEngine';
import { ProteinTaxonomyService } from '../services/ProteinTaxonomyService';

const prisma = new PrismaClient();

async function runTests() {
    console.log('================================================================');
    console.log('🧪 RUNNING HARDENED TARGET GOVERNANCE & TAXONOMY TEST SUITE v2 ');
    console.log('================================================================\n');

    let testsPassed = 0;
    let testsFailed = 0;

    function assert(condition: boolean, testName: string) {
        if (condition) {
            console.log(`  ✅ PASS: ${testName}`);
            testsPassed++;
        } else {
            console.error(`  ❌ FAIL: ${testName}`);
            testsFailed++;
        }
    }

    try {
        // ---------------------------------------------------------------------
        // 1. RBAC & Explicit Capability Authorization Tests
        // ---------------------------------------------------------------------
        console.log('--- 1. TESTING EXECUTIVE TARGET APPROVAL RBAC & CAPABILITIES ---');

        const ownerUser = { role: 'owner', capabilities: ['CORPORATE_TARGET_APPROVE'], is_primary: false };
        assert(TargetGovernanceEngine.canUserApproveTarget(ownerUser), 'RBAC: Owner with capability can approve target');

        const directorNoCap = { role: 'director', capabilities: [], is_primary: false };
        assert(!TargetGovernanceEngine.canUserApproveTarget(directorNoCap), 'RBAC: Director without capability DENIED');

        const directorPrimaryNoCap = { role: 'director', capabilities: [], is_primary: true };
        assert(!TargetGovernanceEngine.canUserApproveTarget(directorPrimaryNoCap), 'RBAC: Director with is_primary = true BUT no capability DENIED');

        const directorWithCap = { role: 'director', capabilities: ['CORPORATE_TARGET_APPROVE'], is_primary: false };
        assert(TargetGovernanceEngine.canUserApproveTarget(directorWithCap), 'RBAC: Director WITH explicit CORPORATE_TARGET_APPROVE capability APPROVED');

        const managerUser = { role: 'manager', capabilities: [], is_primary: true };
        assert(!TargetGovernanceEngine.canUserApproveTarget(managerUser), 'RBAC: Manager with is_primary DENIED');

        const areaManagerUser = { role: 'area_manager', capabilities: [], is_primary: false };
        assert(!TargetGovernanceEngine.canUserApproveTarget(areaManagerUser), 'RBAC: Area Manager DENIED');

        const viewerUser = { role: 'viewer', capabilities: [], is_primary: false };
        assert(!TargetGovernanceEngine.canUserApproveTarget(viewerUser), 'RBAC: Viewer DENIED');

        const nullUser = null as any;
        assert(!TargetGovernanceEngine.canUserApproveTarget(nullUser), 'RBAC: System/null user context DENIED (Fail Closed)');


        // ---------------------------------------------------------------------
        // 2. Protein Taxonomy Rules & Invariants
        // ---------------------------------------------------------------------
        console.log('\n--- 2. TESTING PROTEIN TAXONOMY SEPARATION RULES ---');

        const ribeyeVsRibs = ProteinTaxonomyService.validateAliasMapping('Beef Ribs', 'Cajun Ribeye');
        assert(!ribeyeVsRibs.isValid, 'Taxonomy Invariant: Cajun Ribeye cannot map to Beef Ribs');

        const lambPicanhaVsRack = ProteinTaxonomyService.validateAliasMapping('Rack of Lamb', 'Lamb Picanha');
        assert(!lambPicanhaVsRack.isValid, 'Taxonomy Invariant: Lamb Picanha cannot map to Rack of Lamb');

        const chickenThighVsDrumstick = ProteinTaxonomyService.validateAliasMapping('Chicken Thighs', 'Chicken Drumstick');
        assert(!chickenThighVsDrumstick.isValid, 'Taxonomy Invariant: Chicken Drumstick cannot map to Chicken Thighs');

        const sausageCheddarVsBrazilian = ProteinTaxonomyService.validateAliasMapping('Brazilian Sausage', 'Cheddar Sausage');
        assert(!sausageCheddarVsBrazilian.isValid, 'Taxonomy Invariant: Cheddar Sausage cannot map to Brazilian Sausage');

        const validPicanhaAlias = ProteinTaxonomyService.validateAliasMapping('Picanha', 'Garlic Picanha');
        assert(validPicanhaAlias.isValid, 'Taxonomy Invariant: Garlic Picanha validly maps to Picanha parent');


        // ---------------------------------------------------------------------
        // 3. Period-Scoped Versioning & Effective Date Boundaries
        // ---------------------------------------------------------------------
        console.log('\n--- 3. TESTING PERIOD-SCOPED VERSIONING & EFFECTIVE DATES ---');

        // Setup test company
        let testCompany = await prisma.company.findFirst({ where: { subdomain: 'gov-test-co-v2' } });
        if (!testCompany) {
            testCompany = await prisma.company.create({
                data: {
                    name: 'Governance Test Corp v2',
                    subdomain: 'gov-test-co-v2',
                    operationType: 'RODIZIO',
                    plan: 'enterprise'
                }
            });
        }
        const cid = testCompany.id;

        // Cleanup past data for test company
        await prisma.preparationTarget.deleteMany({ where: { company_id: cid } });
        await prisma.storeTargetAllocation.deleteMany({ where: { store: { company_id: cid } } });
        await prisma.store.deleteMany({ where: { company_id: cid } });
        await prisma.organizationTargetVersion.deleteMany({ where: { company_id: cid } });

        // Create YEAR Version 1 (Effective Jan 1, 2027)
        const draftYearV1 = await TargetGovernanceEngine.createTargetVersion({
            companyId: cid,
            targetCostPax: 9.80,
            targetLbsPax: 1.90,
            effectiveFrom: new Date('2027-01-01'),
            fiscalYear: 2027,
            periodType: 'YEAR',
            periodIdentifier: 'FY2027',
            createdBy: 'exec-1',
            reason: 'FY2027 Initial Corporate Objective'
        });
        assert(draftYearV1.version === 1 && draftYearV1.period_type === 'YEAR', 'FY2027 YEAR Version 1 created as DRAFT');
        assert(draftYearV1.targetMetrics.length >= 2, 'Normalized OrganizationTargetMetric records populated for LBS_PER_GUEST & COST_PER_GUEST');

        // Approve YEAR Version 1
        const approvedYearV1 = await TargetGovernanceEngine.approveTargetVersion(draftYearV1.id, 'owner-1');
        assert(approvedYearV1.status === 'APPROVED', 'FY2027 YEAR Version 1 approved by Owner');

        // Create QUARTER Version 1 for Q1-2027 (Period Scope Isolation Check!)
        const draftQ1V1 = await TargetGovernanceEngine.createTargetVersion({
            companyId: cid,
            targetCostPax: 9.75,
            targetLbsPax: 1.88,
            effectiveFrom: new Date('2027-01-01'),
            fiscalYear: 2027,
            periodType: 'QUARTER',
            periodIdentifier: 'Q1-2027',
            createdBy: 'exec-1',
            reason: 'Q1-2027 Specific Target'
        });
        assert(draftQ1V1.version === 1 && draftQ1V1.period_type === 'QUARTER', 'Q1-2027 QUARTER Version 1 created independently without collision');

        // Approve Q1 Version 1
        await TargetGovernanceEngine.approveTargetVersion(draftQ1V1.id, 'owner-1');

        // Effective date lookup on March 15, 2027 for Q1-2027 scope resolves Q1 Version 1
        const marchQ1Lookup = await TargetGovernanceEngine.resolveEffectiveTarget(cid, new Date('2027-03-15'), 'QUARTER', 'Q1-2027');
        assert(marchQ1Lookup?.version === 1 && marchQ1Lookup?.target_cost_pax === 9.75, 'Effective lookup on March 15 for Q1 scope resolves Q1 Version 1 ($9.75)');

        // Create YEAR Version 2 (Effective July 1, 2027)
        const draftYearV2 = await TargetGovernanceEngine.createTargetVersion({
            companyId: cid,
            targetCostPax: 9.60,
            targetLbsPax: 1.86,
            effectiveFrom: new Date('2027-07-01'),
            fiscalYear: 2027,
            periodType: 'YEAR',
            periodIdentifier: 'FY2027',
            createdBy: 'exec-1',
            reason: 'Mid-year Revised Corporate Objective'
        });
        const approvedYearV2 = await TargetGovernanceEngine.approveTargetVersion(draftYearV2.id, 'owner-1');
        assert(approvedYearV2.version === 2, 'FY2027 YEAR Version 2 approved');

        // March lookup should STILL resolve Version 1 (Historical target preservation invariant!)
        const marchPostV2 = await TargetGovernanceEngine.resolveEffectiveTarget(cid, new Date('2027-03-15'), 'YEAR', 'FY2027');
        assert(marchPostV2?.version === 1 && marchPostV2?.target_cost_pax === 9.80, 'Historical March 15 lookup preserved YEAR Version 1 ($9.80) after V2 release');

        // August lookup resolves YEAR Version 2
        const augustLookup = await TargetGovernanceEngine.resolveEffectiveTarget(cid, new Date('2027-08-15'), 'YEAR', 'FY2027');
        assert(augustLookup?.version === 2 && augustLookup?.target_cost_pax === 9.60, 'Effective lookup on August 15 resolves YEAR Version 2 ($9.60)');


        // ---------------------------------------------------------------------
        // 4. Period Hierarchy & Ancestry Resolution
        // ---------------------------------------------------------------------
        console.log('\n--- 4. TESTING PERIOD HIERARCHY & ANCESTRY ---');

        const quarterAncestry = TargetGovernanceEngine.resolvePeriodAncestry('QUARTER', 'Q1-2027');
        assert(quarterAncestry.parentType === 'YEAR' && quarterAncestry.parentIdentifier === 'FY2027', 'Period Hierarchy: Q1-2027 parent is FY2027');

        const monthAncestry = TargetGovernanceEngine.resolvePeriodAncestry('MONTH', '2027-01');
        assert(monthAncestry.parentType === 'QUARTER' && monthAncestry.parentIdentifier === 'Q1-2027', 'Period Hierarchy: 2027-01 parent is Q1-2027');

        const weekAncestry = TargetGovernanceEngine.resolvePeriodAncestry('WEEK', '2027-W01');
        assert(weekAncestry.parentType === 'MONTH' && weekAncestry.parentIdentifier === '2027-01', 'Period Hierarchy: 2027-W01 parent is 2027-01');


        // ---------------------------------------------------------------------
        // 5. Projected Covers Fail-Closed Weighted Reconciliation Tests
        // ---------------------------------------------------------------------
        console.log('\n--- 5. TESTING PROJECTED COVERS & FAIL-CLOSED RECONCILIATION ---');

        // Setup test stores for allocations
        const store1 = await prisma.store.create({ data: { company_id: cid, store_name: 'Gov Store 1', location: 'Loc 1' } });
        const store2 = await prisma.store.create({ data: { company_id: cid, store_name: 'Gov Store 2', location: 'Loc 2' } });
        const store3 = await prisma.store.create({ data: { company_id: cid, store_name: 'Gov Store 3', location: 'Loc 3' } });

        // Test missing projected covers -> FAIL CLOSED (RECONCILIATION_INCOMPLETE)
        const incompleteAllocations = [
            { storeId: store1.id, allocatedLbsPax: 1.85, allocatedCostPax: 9.60, projectedCovers: 2000, forecastSource: 'SALES_FORECAST' },
            { storeId: store2.id, allocatedLbsPax: 1.90, allocatedCostPax: 9.80, projectedCovers: null } // MISSING COVERS!
        ];

        const incompleteRecon = TargetGovernanceEngine.calculateWeightedReconciliation(incompleteAllocations, 1.87, 9.70);
        assert(incompleteRecon.status === 'RECONCILIATION_INCOMPLETE' && !incompleteRecon.isValid, 'Missing projected covers fails closed with RECONCILIATION_INCOMPLETE');
        assert((incompleteRecon as any).missingStoreIds?.includes(store2.id), `Structured missingStoreIds correctly identifies store ${store2.id}`);

        // Test complete projected covers -> SUCCESS (RECONCILIATION_COMPLETE)
        const completeAllocations = [
            { storeId: store1.id, allocatedLbsPax: 1.84, allocatedCostPax: 9.55, projectedCovers: 2000, forecastSource: 'SALES_FORECAST' },
            { storeId: store2.id, allocatedLbsPax: 1.92, allocatedCostPax: 9.90, projectedCovers: 2000, forecastSource: 'APPROVED_BUDGET' },
            { storeId: store3.id, allocatedLbsPax: 1.94, allocatedCostPax: 9.95, projectedCovers: 1000, forecastSource: 'AUTHORIZED_MANUAL_INPUT' }
        ];

        const completeRecon = TargetGovernanceEngine.calculateWeightedReconciliation(completeAllocations, 1.89, 9.77);
        assert(completeRecon.status === 'RECONCILIATION_COMPLETE' && completeRecon.isValid, 'Complete projected covers reconciles correctly as RECONCILIATION_COMPLETE');


        // ---------------------------------------------------------------------
        // 6. Target Scenario Simulation Sandbox
        // ---------------------------------------------------------------------
        console.log('\n--- 6. TESTING SCENARIO SIMULATION SANDBOX ---');

        const simResult = await TargetGovernanceEngine.simulateScenario({
            companyId: cid,
            scenarioName: 'Q4 Cost Efficiency Simulation',
            proposedCostPax: 9.50,
            proposedLbsPax: 1.82,
            simulatedBy: 'analyst-1',
            allocations: completeAllocations
        });

        assert(!simResult.simulation.is_promoted, 'Scenario simulation created without mutating production target');

        // Promote scenario to official target version
        const promotedVersion = await TargetGovernanceEngine.promoteScenarioToTargetVersion(
            simResult.simulation.id,
            'owner-1',
            new Date('2027-10-01'),
            'Promoted Q4 Scenario'
        );

        assert(promotedVersion.status === 'APPROVED' && promotedVersion.version === 3, 'Simulation successfully promoted to Version 3 official approved target');


        // ---------------------------------------------------------------------
        // 7. Preparation Target Architecture & Mass Reconciliation Tests
        // ---------------------------------------------------------------------
        console.log('\n--- 7. TESTING PREPARATION TARGETS & MASS RECONCILIATION ---');

        const sid = store1.id;
        const targetDate = new Date('2027-05-15');

        // Set preparation targets for Picanha subproducts under 100lb parent planned volume
        await TargetGovernanceEngine.setPreparationTarget({
            companyId: cid,
            storeId: sid,
            parentProtein: 'Picanha',
            subproductName: 'Traditional Picanha',
            targetQuantity: 50.00,
            targetDate,
            plannedParentQuantity: 100.00,
            aiRecommendedQty: 48.00,
            actualPreparedQty: 52.00,
            createdBy: 'chef-1'
        });

        await TargetGovernanceEngine.setPreparationTarget({
            companyId: cid,
            storeId: sid,
            parentProtein: 'Picanha',
            subproductName: 'Garlic Picanha',
            targetQuantity: 30.00,
            targetDate,
            plannedParentQuantity: 100.00,
            aiRecommendedQty: 28.00,
            actualPreparedQty: 31.00,
            createdBy: 'chef-1'
        });

        await TargetGovernanceEngine.setPreparationTarget({
            companyId: cid,
            storeId: sid,
            parentProtein: 'Picanha',
            subproductName: 'Jalapeño Picanha',
            targetQuantity: 20.00,
            targetDate,
            plannedParentQuantity: 100.00,
            aiRecommendedQty: 22.00,
            actualPreparedQty: 18.00,
            createdBy: 'chef-1'
        });

        // Reconcile 100% preparation mass (50 + 30 + 20 = 100lb)
        const fullMassRecon = await TargetGovernanceEngine.reconcilePreparationMass(cid, sid, 'Picanha', targetDate, 100.00);
        assert(fullMassRecon.isMassReconciled, 'Preparation Mass Reconciliation: 100lb total subproducts reconciles against 100lb planned');
        assert(fullMassRecon.unpreparedParentQuantity === 0, 'Unprepared parent quantity is 0lb when 100% allocated');
        assert(fullMassRecon.subproducts.length === 3, 'All 3 Picanha subproducts (Traditional, Garlic, Jalapeño) returned');

        // Verify separate layers (AI Recommendation != Target != Actual)
        const garlicSub = fullMassRecon.subproducts.find(s => s.subproductName === 'Garlic Picanha');
        assert(
            garlicSub?.aiRecommendedQty === 28.00 &&
            garlicSub?.targetQuantity === 30.00 &&
            garlicSub?.actualPreparedQty === 31.00 &&
            garlicSub?.variance === 1.00,
            'Layer Separation: AI Recommended (28lb) != Target (30lb) != Actual (31lb) with +1lb variance'
        );

        // Test partial preparation allocation (80lb total subproducts under 100lb planned)
        await prisma.preparationTarget.deleteMany({
            where: { store_id: sid, subproduct_name: 'Jalapeño Picanha', target_date: targetDate }
        });

        const partialMassRecon = await TargetGovernanceEngine.reconcilePreparationMass(cid, sid, 'Picanha', targetDate, 100.00);
        assert(partialMassRecon.isMassReconciled, 'Partial Mass Allocation: 80lb subproducts validly reconciles under 100lb parent planned');
        assert(partialMassRecon.unpreparedParentQuantity === 20.00, 'Explicitly preserved unprepared parent protein mass = 20lb');

        // Cleanup test data
        await prisma.preparationTarget.deleteMany({ where: { company_id: cid } });
        await prisma.storeTargetAllocation.deleteMany({ where: { store: { company_id: cid } } });
        await prisma.store.deleteMany({ where: { company_id: cid } });
        await prisma.organizationTargetVersion.deleteMany({ where: { company_id: cid } });
        await prisma.company.delete({ where: { id: cid } });

        console.log('\n================================================================');
        console.log(`🎉 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
        console.log('================================================================\n');

        if (testsFailed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    } catch (err: any) {
        console.error('TEST SUITE EXCEPTION:', err);
        process.exit(1);
    }
}

runTests();
