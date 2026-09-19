// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Target Governance Routes (Hardened v2)

import { Router } from 'express';
import { TargetGovernanceController } from '../controllers/TargetGovernanceController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/targets/effective', TargetGovernanceController.getEffectiveTarget);
router.post('/targets/versions', TargetGovernanceController.createTargetVersion);
router.post('/targets/versions/:id/approve', TargetGovernanceController.approveTargetVersion);
router.post('/targets/reconcile', TargetGovernanceController.validateReconciliation);
router.post('/targets/simulate', TargetGovernanceController.simulateScenario);
router.post('/targets/simulate/:id/promote', TargetGovernanceController.promoteScenario);
router.post('/preparation-targets', TargetGovernanceController.setPreparationTarget);
router.post('/preparation-targets/reconcile', TargetGovernanceController.reconcilePreparation);
router.post('/taxonomy/validate-alias', TargetGovernanceController.validateTaxonomyAlias);

export default router;
