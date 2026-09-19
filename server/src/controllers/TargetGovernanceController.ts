// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Target Governance Controller (Hardened v2)

import { Request, Response } from 'express';
import { TargetGovernanceEngine } from '../services/TargetGovernanceEngine';
import { ProteinTaxonomyService } from '../services/ProteinTaxonomyService';

export class TargetGovernanceController {

    /**
     * GET /api/v1/governance/targets/effective
     * Resolves the target version effective for a given date.
     */
    static async getEffectiveTarget(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user || !user.companyId) {
                return res.status(403).json({ error: 'Access Denied: Missing tenant company context' });
            }

            const targetDate = req.query.date ? new Date(req.query.date as string) : new Date();
            const periodType = (req.query.periodType as string) || 'YEAR';
            const periodIdentifier = (req.query.periodIdentifier as string) || `FY${targetDate.getFullYear()}`;

            const version = await TargetGovernanceEngine.resolveEffectiveTarget(user.companyId, targetDate, periodType, periodIdentifier);
            return res.json(version || { message: 'No active target version found for specified date', effective: false });
        } catch (error: any) {
            console.error('getEffectiveTarget Error:', error);
            return res.status(500).json({ error: 'Failed to resolve effective target' });
        }
    }

    /**
     * POST /api/v1/governance/targets/versions
     * Creates a draft target version.
     */
    static async createTargetVersion(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user || !user.companyId) {
                return res.status(403).json({ error: 'Access Denied: Missing tenant company context' });
            }

            // RBAC Check: Owner or CORPORATE_TARGET_CREATE / CORPORATE_TARGET_APPROVE capability
            const userCapabilities = user.capabilities || [];
            const hasCreateCap = userCapabilities.includes('CORPORATE_TARGET_CREATE') || userCapabilities.includes('CORPORATE_TARGET_APPROVE');
            const canCreate = user.role === 'owner' || user.role === 'admin' || user.role === 'director' || hasCreateCap;

            if (!canCreate) {
                return res.status(403).json({ error: 'Access Denied: Insufficient permissions to create target versions' });
            }

            const { targetCostPax, targetLbsPax, effectiveFrom, fiscalYear, periodType, periodIdentifier, reason, storeAllocations, additionalMetrics } = req.body;

            if (!targetCostPax || !targetLbsPax || !effectiveFrom) {
                return res.status(400).json({ error: 'targetCostPax, targetLbsPax, and effectiveFrom are required' });
            }

            const version = await TargetGovernanceEngine.createTargetVersion({
                companyId: user.companyId,
                targetCostPax: parseFloat(targetCostPax),
                targetLbsPax: parseFloat(targetLbsPax),
                effectiveFrom: new Date(effectiveFrom),
                fiscalYear: fiscalYear ? parseInt(fiscalYear) : 2027,
                periodType: periodType || 'YEAR',
                periodIdentifier: periodIdentifier || 'FY2027',
                createdBy: user.id || user.email || 'executive',
                reason,
                storeAllocations,
                additionalMetrics
            });

            return res.json(version);
        } catch (error: any) {
            console.error('createTargetVersion Error:', error);
            return res.status(500).json({ error: 'Failed to create target version' });
        }
    }

    /**
     * POST /api/v1/governance/targets/versions/:id/approve
     * Approves a target version. RESTRICTED TO AUTHORIZED EXECUTIVE / OWNER WITH CORPORATE_TARGET_APPROVE CAPABILITY ONLY.
     * is_primary = true alone grants ZERO target approval authority!
     */
    static async approveTargetVersion(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user || !user.companyId) {
                return res.status(403).json({ error: 'Access Denied: Missing tenant company context' });
            }

            // STRICT RBAC CHECK via TargetGovernanceEngine
            const canApprove = TargetGovernanceEngine.canUserApproveTarget(user);
            if (!canApprove) {
                return res.status(403).json({
                    error: 'Access Denied: Explicit CORPORATE_TARGET_APPROVE capability or Owner authority is required to approve corporate target versions'
                });
            }

            const versionId = req.params.id;
            const { reason } = req.body;

            const approvedVersion = await TargetGovernanceEngine.approveTargetVersion(versionId, user.id || user.email, reason);
            return res.json(approvedVersion);
        } catch (error: any) {
            console.error('approveTargetVersion Error:', error);
            return res.status(500).json({ error: error.message || 'Failed to approve target version' });
        }
    }

    /**
     * POST /api/v1/governance/targets/reconcile
     * Validates weighted reconciliation between store target allocations and company objectives.
     * FAIL-CLOSED: Missing projected covers return RECONCILIATION_INCOMPLETE.
     */
    static async validateReconciliation(req: Request, res: Response) {
        try {
            const { allocations, companyTargetLbsPax, companyTargetCostPax } = req.body;

            if (!allocations || !Array.isArray(allocations)) {
                return res.status(400).json({ error: 'allocations array is required' });
            }

            const result = TargetGovernanceEngine.calculateWeightedReconciliation(
                allocations,
                parseFloat(companyTargetLbsPax || 1.90),
                parseFloat(companyTargetCostPax || 9.80)
            );

            return res.json(result);
        } catch (error: any) {
            console.error('validateReconciliation Error:', error);
            return res.status(500).json({ error: 'Failed to compute weighted reconciliation' });
        }
    }

    /**
     * POST /api/v1/governance/targets/simulate
     * Simulates a target scenario without committing an official production version.
     */
    static async simulateScenario(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user || !user.companyId) {
                return res.status(403).json({ error: 'Access Denied: Missing tenant company context' });
            }

            const { scenarioName, proposedCostPax, proposedLbsPax, allocations } = req.body;

            if (!scenarioName || !proposedCostPax || !proposedLbsPax) {
                return res.status(400).json({ error: 'scenarioName, proposedCostPax, and proposedLbsPax are required' });
            }

            const simulation = await TargetGovernanceEngine.simulateScenario({
                companyId: user.companyId,
                scenarioName,
                proposedCostPax: parseFloat(proposedCostPax),
                proposedLbsPax: parseFloat(proposedLbsPax),
                simulatedBy: user.id || user.email || 'simulator',
                allocations: allocations || []
            });

            return res.json(simulation);
        } catch (error: any) {
            console.error('simulateScenario Error:', error);
            return res.status(500).json({ error: 'Failed to simulate scenario' });
        }
    }

    /**
     * POST /api/v1/governance/targets/simulate/:id/promote
     * Promotes a simulation scenario into an official TargetVersion (Executive / Owner Only).
     */
    static async promoteScenario(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user || !user.companyId) {
                return res.status(403).json({ error: 'Access Denied: Missing tenant company context' });
            }

            const canApprove = TargetGovernanceEngine.canUserApproveTarget(user);
            if (!canApprove) {
                return res.status(403).json({
                    error: 'Access Denied: Explicit CORPORATE_TARGET_APPROVE capability or Owner authority is required to promote scenario to official target version'
                });
            }

            const simulationId = req.params.id;
            const { effectiveFrom, reason } = req.body;
            const effectiveDate = effectiveFrom ? new Date(effectiveFrom) : new Date();

            const approvedVersion = await TargetGovernanceEngine.promoteScenarioToTargetVersion(
                simulationId,
                user.id || user.email,
                effectiveDate,
                reason
            );

            return res.json(approvedVersion);
        } catch (error: any) {
            console.error('promoteScenario Error:', error);
            return res.status(500).json({ error: error.message || 'Failed to promote simulation scenario' });
        }
    }

    /**
     * POST /api/v1/governance/preparation-targets
     * Persists or updates a subproduct preparation target under a canonical parent protein.
     */
    static async setPreparationTarget(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user || !user.companyId) {
                return res.status(403).json({ error: 'Access Denied: Missing tenant company context' });
            }

            const { storeId, parentProtein, subproductName, targetQuantity, unit, targetDate, plannedParentQuantity, source, aiRecommendedQty, actualPreparedQty } = req.body;

            if (!storeId || !parentProtein || !subproductName || targetQuantity === undefined || !targetDate) {
                return res.status(400).json({ error: 'storeId, parentProtein, subproductName, targetQuantity, and targetDate are required' });
            }

            const prepTarget = await TargetGovernanceEngine.setPreparationTarget({
                companyId: user.companyId,
                storeId: parseInt(storeId),
                parentProtein,
                subproductName,
                targetQuantity: parseFloat(targetQuantity),
                unit,
                targetDate: new Date(targetDate),
                plannedParentQuantity: plannedParentQuantity ? parseFloat(plannedParentQuantity) : undefined,
                source,
                aiRecommendedQty: aiRecommendedQty ? parseFloat(aiRecommendedQty) : undefined,
                actualPreparedQty: actualPreparedQty ? parseFloat(actualPreparedQty) : undefined,
                createdBy: user.id || user.email || 'manager'
            });

            return res.json(prepTarget);
        } catch (error: any) {
            console.error('setPreparationTarget Error:', error);
            return res.status(500).json({ error: 'Failed to set preparation target' });
        }
    }

    /**
     * POST /api/v1/governance/preparation-targets/reconcile
     * Executes mass reconciliation for subproduct preparation targets derived from a canonical parent protein.
     */
    static async reconcilePreparation(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user || !user.companyId) {
                return res.status(403).json({ error: 'Access Denied: Missing tenant company context' });
            }

            const { storeId, parentProtein, targetDate, plannedParentQuantity } = req.body;

            if (!storeId || !parentProtein || !targetDate) {
                return res.status(400).json({ error: 'storeId, parentProtein, and targetDate are required' });
            }

            const result = await TargetGovernanceEngine.reconcilePreparationMass(
                user.companyId,
                parseInt(storeId),
                parentProtein,
                new Date(targetDate),
                plannedParentQuantity ? parseFloat(plannedParentQuantity) : undefined
            );

            return res.json(result);
        } catch (error: any) {
            console.error('reconcilePreparation Error:', error);
            return res.status(500).json({ error: 'Failed to reconcile preparation target mass' });
        }
    }

    /**
     * POST /api/v1/governance/taxonomy/validate-alias
     * Validates product alias mappings against BRASA Core taxonomy rules.
     */
    static async validateTaxonomyAlias(req: Request, res: Response) {
        try {
            const { canonicalName, aliasName } = req.body;

            if (!canonicalName || !aliasName) {
                return res.status(400).json({ error: 'canonicalName and aliasName are required' });
            }

            const result = ProteinTaxonomyService.validateAliasMapping(canonicalName, aliasName);
            return res.json(result);
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to validate taxonomy alias' });
        }
    }
}
