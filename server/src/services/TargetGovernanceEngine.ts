// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Target Governance Engine (Hardened v2)

import { PrismaClient } from '@prisma/client';
import { AuditService } from './AuditService';

const prisma = new PrismaClient();

export interface StoreAllocationInput {
    storeId: number;
    tierName?: string;
    allocatedLbsPax: number;
    allocatedCostPax: number;
    projectedCovers?: number | null;
    forecastSource?: string;
}

export interface MetricInput {
    metricType: string;
    targetValue: number;
    unit: string;
}

export interface PreparationTargetInput {
    companyId: string;
    storeId: number;
    parentProtein: string;
    subproductName: string;
    targetQuantity: number;
    unit?: string;
    targetDate: Date;
    plannedParentQuantity?: number;
    source?: string;
    aiRecommendedQty?: number;
    actualPreparedQty?: number;
    createdBy: string;
}

export class TargetGovernanceEngine {

    /**
     * RBAC Hardening: Verifies whether a user identity holds explicit authority to approve corporate targets.
     * Rule: Authorized Executive / Owner + explicit 'CORPORATE_TARGET_APPROVE' capability.
     * Director role WITHOUT capability (even with is_primary = true) is DENIED.
     */
    static canUserApproveTarget(user: { role?: string; capabilities?: string[]; is_primary?: boolean }): boolean {
        if (!user) return false;
        
        const userCapabilities = user.capabilities || [];
        const hasExplicitCapability = userCapabilities.includes('CORPORATE_TARGET_APPROVE');
        const isOwner = user.role === 'owner';

        // Owner or explicit CORPORATE_TARGET_APPROVE capability holder
        if (isOwner || hasExplicitCapability) {
            return true;
        }

        // is_primary MUST NOT silently elevate a Director or Manager into target approval authority!
        return false;
    }

    /**
     * Resolves deterministic period hierarchy & parent relationship.
     * Hierarchy: YEAR -> QUARTER -> MONTH -> WEEK
     */
    static resolvePeriodAncestry(periodType: string, periodIdentifier: string): { parentType: string | null; parentIdentifier: string | null } {
        const type = (periodType || 'YEAR').toUpperCase();
        if (type === 'YEAR') {
            return { parentType: null, parentIdentifier: null };
        }
        if (type === 'QUARTER') {
            // e.g. Q1-2027 -> parent FY2027
            const yearMatch = periodIdentifier.match(/20\d\d/);
            const year = yearMatch ? yearMatch[0] : '2027';
            return { parentType: 'YEAR', parentIdentifier: `FY${year}` };
        }
        if (type === 'MONTH') {
            // e.g. 2027-01 -> parent Q1-2027
            const parts = periodIdentifier.split('-');
            const year = parts[0] || '2027';
            const month = parseInt(parts[1] || '1', 10);
            const quarter = Math.ceil(month / 3);
            return { parentType: 'QUARTER', parentIdentifier: `Q${quarter}-${year}` };
        }
        if (type === 'WEEK') {
            // e.g. 2027-W01 -> parent 2027-01
            const parts = periodIdentifier.split('-W');
            const year = parts[0] || '2027';
            return { parentType: 'MONTH', parentIdentifier: `${year}-01` };
        }
        return { parentType: null, parentIdentifier: null };
    }

    /**
     * Resolves the active effective OrganizationTargetVersion for a given company, target date, and optional period.
     * Temporal boundary check: effective_from <= dateOnly AND (effective_to IS NULL OR effective_to >= dateOnly)
     */
    static async resolveEffectiveTarget(companyId: string, targetDate: Date = new Date(), periodType: string = 'YEAR', periodIdentifier: string = 'FY2027') {
        const dateOnly = new Date(targetDate.toISOString().split('T')[0]);

        // 1. Try period-scoped target version
        let version = await prisma.organizationTargetVersion.findFirst({
            where: {
                company_id: companyId,
                period_type: periodType,
                period_identifier: periodIdentifier,
                status: { in: ['APPROVED', 'SUPERSEDED'] },
                effective_from: { lte: dateOnly },
                OR: [
                    { effective_to: null },
                    { effective_to: { gte: dateOnly } }
                ]
            },
            include: {
                storeAllocations: { include: { store: true } },
                targetMetrics: true
            },
            orderBy: { version: 'desc' }
        });

        // 2. Fall back to parent period or active YEAR target if sub-period target not specifically set
        if (!version) {
            version = await prisma.organizationTargetVersion.findFirst({
                where: {
                    company_id: companyId,
                    status: { in: ['APPROVED', 'SUPERSEDED'] },
                    effective_from: { lte: dateOnly },
                    OR: [
                        { effective_to: null },
                        { effective_to: { gte: dateOnly } }
                    ]
                },
                include: {
                    storeAllocations: { include: { store: true } },
                    targetMetrics: true
                },
                orderBy: { version: 'desc' }
            });
        }

        return version;
    }

    /**
     * Creates a new target version with period-scoped revision sequence and normalized metric records.
     */
    static async createTargetVersion(data: {
        companyId: string;
        targetCostPax: number;
        targetLbsPax: number;
        effectiveFrom: Date;
        fiscalYear?: number;
        periodType?: string;
        periodIdentifier?: string;
        createdBy: string;
        reason?: string;
        storeAllocations?: StoreAllocationInput[];
        additionalMetrics?: MetricInput[];
    }) {
        const periodType = data.periodType || 'YEAR';
        const periodIdentifier = data.periodIdentifier || `FY${data.fiscalYear || 2027}`;

        // PERIOD-SCOPED VERSIONING: Version sequence is calculated within [company_id, period_type, period_identifier]
        const nextVersionNumber = (await prisma.organizationTargetVersion.count({
            where: {
                company_id: data.companyId,
                period_type: periodType,
                period_identifier: periodIdentifier
            }
        })) + 1;

        const effectiveFromDate = new Date(data.effectiveFrom.toISOString().split('T')[0]);

        const targetVersion = await prisma.organizationTargetVersion.create({
            data: {
                company_id: data.companyId,
                version: nextVersionNumber,
                status: 'DRAFT',
                target_cost_pax: data.targetCostPax,
                target_lbs_pax: data.targetLbsPax,
                effective_from: effectiveFromDate,
                fiscal_year: data.fiscalYear || 2027,
                period_type: periodType,
                period_identifier: periodIdentifier,
                created_by: data.createdBy,
                reason: data.reason || 'Initial target creation draft',
                targetMetrics: {
                    create: [
                        { metric_type: 'LBS_PER_GUEST', target_value: data.targetLbsPax, unit: 'lb/guest' },
                        { metric_type: 'COST_PER_GUEST', target_value: data.targetCostPax, unit: 'USD/guest' },
                        ...(data.additionalMetrics || []).map(m => ({
                            metric_type: m.metricType,
                            target_value: m.targetValue,
                            unit: m.unit
                        }))
                    ]
                },
                storeAllocations: data.storeAllocations ? {
                    create: data.storeAllocations.map(a => ({
                        store_id: a.storeId,
                        tier_name: a.tierName || 'TIER 5 (Standard Calibrated)',
                        allocated_lbs_pax: a.allocatedLbsPax,
                        allocated_cost_pax: a.allocatedCostPax,
                        projected_covers: a.projectedCovers ?? null,
                        forecast_source: a.forecastSource || (a.projectedCovers ? 'MANUAL_AUTHORIZED_INPUT' : null)
                    }))
                } : undefined
            },
            include: {
                storeAllocations: true,
                targetMetrics: true
            }
        });

        await AuditService.logAction(
            data.createdBy,
            'TARGET_VERSION_CREATED',
            `OrganizationTargetVersion ${targetVersion.id}`,
            { version: nextVersionNumber, periodType, periodIdentifier, companyId: data.companyId, status: 'DRAFT' }
        );

        return targetVersion;
    }

    /**
     * Approves a target version (Authorized Executive / Owner Action Only).
     * Automatically supersedes previous active version for the same period scope and updates effective_to date.
     */
    static async approveTargetVersion(versionId: string, approvedByUserId: string, reason?: string) {
        const version = await prisma.organizationTargetVersion.findUnique({
            where: { id: versionId }
        });

        if (!version) {
            throw new Error('Target version not found');
        }

        if (version.status === 'APPROVED') {
            return version; // Already approved
        }

        const effectiveFrom = version.effective_from;

        // Supersede previous active target version within the SAME target scope
        const previousActive = await prisma.organizationTargetVersion.findFirst({
            where: {
                company_id: version.company_id,
                period_type: version.period_type,
                period_identifier: version.period_identifier,
                status: 'APPROVED',
                effective_from: { lt: effectiveFrom }
            },
            orderBy: { version: 'desc' }
        });

        if (previousActive) {
            const dayBefore = new Date(effectiveFrom);
            dayBefore.setDate(dayBefore.getDate() - 1);

            await prisma.organizationTargetVersion.update({
                where: { id: previousActive.id },
                data: {
                    status: 'SUPERSEDED',
                    effective_to: dayBefore
                }
            });
        }

        // Approve target version
        const approvedVersion = await prisma.organizationTargetVersion.update({
            where: { id: versionId },
            data: {
                status: 'APPROVED',
                approved_by: approvedByUserId,
                approved_at: new Date(),
                reason: reason || version.reason
            },
            include: { storeAllocations: true, targetMetrics: true }
        });

        await AuditService.logAction(
            approvedByUserId,
            'TARGET_VERSION_APPROVED',
            `OrganizationTargetVersion ${versionId}`,
            {
                version: approvedVersion.version,
                periodType: approvedVersion.period_type,
                periodIdentifier: approvedVersion.period_identifier,
                companyId: approvedVersion.company_id,
                approvedBy: approvedByUserId,
                effectiveFrom: approvedVersion.effective_from
            }
        );

        return approvedVersion;
    }

    /**
     * Solves weighted reconciliation between store allocations and company targets.
     * FAIL-CLOSED: If any store is missing projected covers, returns RECONCILIATION_INCOMPLETE.
     */
    static calculateWeightedReconciliation(allocations: StoreAllocationInput[], companyTargetLbsPax: number, companyTargetCostPax: number) {
        if (!allocations || allocations.length === 0) {
            return {
                status: 'RECONCILIATION_INCOMPLETE',
                isValid: false,
                reason: 'No store allocations provided for reconciliation',
                missingStoreIds: [],
                includedStoreIds: [],
                coveragePercentage: 0
            };
        }

        // Check for missing projected covers
        const missingCoversStores = allocations.filter(a => a.projectedCovers === null || a.projectedCovers === undefined || a.projectedCovers <= 0);
        const validCoversStores = allocations.filter(a => a.projectedCovers !== null && a.projectedCovers !== undefined && a.projectedCovers > 0);

        if (missingCoversStores.length > 0) {
            const coveragePct = (validCoversStores.length / allocations.length) * 100;
            return {
                status: 'RECONCILIATION_INCOMPLETE',
                isValid: false,
                reason: `Missing projected covers for ${missingCoversStores.length} of ${allocations.length} stores in allocation scope`,
                missingStoreIds: missingCoversStores.map(a => a.storeId),
                includedStoreIds: validCoversStores.map(a => a.storeId),
                coveragePercentage: parseFloat(coveragePct.toFixed(2))
            };
        }

        // All stores have valid projected covers -> Execute weighted reconciliation
        let totalCovers = 0;
        let weightedLbsSum = 0;
        let weightedCostSum = 0;

        for (const alloc of allocations) {
            const covers = alloc.projectedCovers!;
            totalCovers += covers;
            weightedLbsSum += alloc.allocatedLbsPax * covers;
            weightedCostSum += alloc.allocatedCostPax * covers;
        }

        const reconciledLbsPax = totalCovers > 0 ? weightedLbsSum / totalCovers : companyTargetLbsPax;
        const reconciledCostPax = totalCovers > 0 ? weightedCostSum / totalCovers : companyTargetCostPax;

        const lbsDiff = Math.abs(reconciledLbsPax - companyTargetLbsPax);
        const costDiff = Math.abs(reconciledCostPax - companyTargetCostPax);

        // Tolerances: 0.02 lbs, $0.05 cost
        const isValid = lbsDiff <= 0.02 && costDiff <= 0.05;

        return {
            status: 'RECONCILIATION_COMPLETE',
            isValid,
            totalCovers,
            companyTargetLbsPax,
            reconciledLbsPax: parseFloat(reconciledLbsPax.toFixed(4)),
            lbsVariance: parseFloat((reconciledLbsPax - companyTargetLbsPax).toFixed(4)),
            companyTargetCostPax,
            reconciledCostPax: parseFloat(reconciledCostPax.toFixed(4)),
            costVariance: parseFloat((reconciledCostPax - companyTargetCostPax).toFixed(4)),
            toleranceMsg: isValid ? 'Reconciliation Invariant Satisfied' : 'Reconciliation Invariant Exceeded Tolerance'
        };
    }

    /**
     * Creates a simulation scenario without mutating official production targets.
     */
    static async simulateScenario(data: {
        companyId: string;
        scenarioName: string;
        proposedCostPax: number;
        proposedLbsPax: number;
        simulatedBy: string;
        allocations: StoreAllocationInput[];
    }) {
        const reconciliation = this.calculateWeightedReconciliation(data.allocations, data.proposedLbsPax, data.proposedCostPax);

        const simulation = await prisma.targetScenarioSimulation.create({
            data: {
                company_id: data.companyId,
                scenario_name: data.scenarioName,
                proposed_cost_pax: data.proposedCostPax,
                proposed_lbs_pax: data.proposedLbsPax,
                simulated_by: data.simulatedBy,
                simulated_payload: {
                    allocations: data.allocations,
                    reconciliation
                } as any
            }
        });

        await AuditService.logAction(
            data.simulatedBy,
            'TARGET_SCENARIO_SIMULATED',
            `TargetScenarioSimulation ${simulation.id}`,
            { scenarioName: data.scenarioName, companyId: data.companyId }
        );

        return { simulation, reconciliation };
    }

    /**
     * Executive Action: Promotes a simulation scenario into an official TargetVersion.
     */
    static async promoteScenarioToTargetVersion(simulationId: string, CLevelUserId: string, effectiveFrom: Date, reason?: string) {
        const sim = await prisma.targetScenarioSimulation.findUnique({
            where: { id: simulationId }
        });

        if (!sim) {
            throw new Error('Simulation scenario not found');
        }

        const payload = sim.simulated_payload as any;
        const allocations: StoreAllocationInput[] = payload?.allocations || [];

        const draft = await this.createTargetVersion({
            companyId: sim.company_id,
            targetCostPax: sim.proposed_cost_pax,
            targetLbsPax: sim.proposed_lbs_pax,
            effectiveFrom,
            createdBy: CLevelUserId,
            reason: reason || `Promoted from simulation: ${sim.scenario_name}`,
            storeAllocations: allocations
        });

        const approved = await this.approveTargetVersion(draft.id, CLevelUserId, reason || `C-Level Promoted from Scenario ${sim.scenario_name}`);

        await prisma.targetScenarioSimulation.update({
            where: { id: simulationId },
            data: {
                is_promoted: true,
                promoted_version_id: approved.id
            }
        });

        return approved;
    }

    // =========================================================================
    // PREPARATION TARGET & MASS RECONCILIATION ENGINE
    // =========================================================================

    /**
     * Persists or updates a subproduct preparation target under a canonical parent protein.
     */
    static async setPreparationTarget(input: PreparationTargetInput) {
        const targetDateOnly = new Date(input.targetDate.toISOString().split('T')[0]);

        const prepTarget = await prisma.preparationTarget.upsert({
            where: {
                store_id_subproduct_name_target_date: {
                    store_id: input.storeId,
                    subproduct_name: input.subproductName,
                    target_date: targetDateOnly
                }
            },
            update: {
                parent_protein: input.parentProtein,
                target_quantity: input.targetQuantity,
                unit: input.unit || 'lb',
                planned_parent_quantity: input.plannedParentQuantity ?? undefined,
                source: input.source || 'AUTHORIZED_MANAGER',
                ai_recommended_qty: input.aiRecommendedQty ?? undefined,
                actual_prepared_qty: input.actualPreparedQty ?? undefined,
                created_by: input.createdBy
            },
            create: {
                company_id: input.companyId,
                store_id: input.storeId,
                parent_protein: input.parentProtein,
                subproduct_name: input.subproductName,
                target_quantity: input.targetQuantity,
                unit: input.unit || 'lb',
                target_date: targetDateOnly,
                planned_parent_quantity: input.plannedParentQuantity ?? null,
                source: input.source || 'AUTHORIZED_MANAGER',
                ai_recommended_qty: input.aiRecommendedQty ?? null,
                actual_prepared_qty: input.actualPreparedQty ?? null,
                created_by: input.createdBy
            }
        });

        await AuditService.logAction(
            input.createdBy,
            'PREPARATION_TARGET_SET',
            `PreparationTarget ${prepTarget.id}`,
            {
                storeId: input.storeId,
                parentProtein: input.parentProtein,
                subproductName: input.subproductName,
                targetQuantity: input.targetQuantity,
                targetDate: targetDateOnly
            }
        );

        return prepTarget;
    }

    /**
     * Performs mass reconciliation for all subproduct preparation targets derived from a parent protein.
     * Mass Invariant: Sum(Subproduct Targets) <= Parent Planned Preparation Quantity.
     * Remaining parent protein is preserved explicitly as unprepared parent mass.
     */
    static async reconcilePreparationMass(companyId: string, storeId: number, parentProtein: string, targetDate: Date, plannedParentQuantity?: number) {
        const targetDateOnly = new Date(targetDate.toISOString().split('T')[0]);

        const subproducts = await prisma.preparationTarget.findMany({
            where: {
                company_id: companyId,
                store_id: storeId,
                parent_protein: parentProtein,
                target_date: targetDateOnly
            }
        });

        const totalSubproductTargetQty = subproducts.reduce((sum, item) => sum + item.target_quantity, 0);
        const totalSubproductActualQty = subproducts.reduce((sum, item) => sum + (item.actual_prepared_qty || 0), 0);

        // Resolve parent planned quantity from parameter or first subproduct record
        const parentPlanned = plannedParentQuantity ?? (subproducts.length > 0 ? (subproducts[0].planned_parent_quantity ?? totalSubproductTargetQty) : 0);

        const unpreparedParentQty = Math.max(0, parseFloat((parentPlanned - totalSubproductTargetQty).toFixed(4)));
        const targetVsActualVariance = parseFloat((totalSubproductActualQty - totalSubproductTargetQty).toFixed(4));
        const isMassReconciled = totalSubproductTargetQty <= parentPlanned;

        return {
            companyId,
            storeId,
            parentProtein,
            targetDate: targetDateOnly,
            plannedParentQuantity: parentPlanned,
            totalSubproductTargetQuantity: parseFloat(totalSubproductTargetQty.toFixed(4)),
            unpreparedParentQuantity: unpreparedParentQty,
            totalSubproductActualQuantity: parseFloat(totalSubproductActualQty.toFixed(4)),
            targetVsActualVariance,
            isMassReconciled,
            subproducts: subproducts.map(s => ({
                id: s.id,
                subproductName: s.subproduct_name,
                targetQuantity: s.target_quantity,
                aiRecommendedQty: s.ai_recommended_qty,
                actualPreparedQty: s.actual_prepared_qty,
                variance: s.actual_prepared_qty !== null ? parseFloat((s.actual_prepared_qty - s.target_quantity).toFixed(4)) : null,
                unit: s.unit
            }))
        };
    }
}
