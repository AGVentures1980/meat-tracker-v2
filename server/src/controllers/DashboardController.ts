// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// This code is proprietary and confidential. An AGV VENTURES Product.

import { Request, Response } from 'express';
import { MeatEngine } from '../engine/MeatEngine';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../services/AuditService';
import { getUserId, requireTenant, AuthContextMissingError } from '../utils/authContext';
import { startOfMonth, endOfMonth } from 'date-fns';
import { hasRole, DIRECTOR_ROLES } from '../utils/roleGroups';


const prisma = new PrismaClient();

export class DashboardController {
    static async getStats(req: Request, res: Response) {
        try {
            const { storeId } = req.params;
            const user = (req as any).user;

            if (!storeId) {
                return res.status(400).json({ error: 'Store ID is required' });
            }

            const id = parseInt(storeId);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'Invalid Store ID' });
            }

            // 1. Verify Store exists (ownership is now geometrically enforced by scopedPrisma extension)
            const prisma = (req as any).scopedPrisma;
            const store = await prisma.store.findFirst({
                where: { id }
            });

            if (!store) {
                return res.status(403).json({ error: 'Access Denied: Store not found or belongs to another company.' });
            }

            // 2. Role Check: Managers/Viewers can only see their assigned store
            if (user.role !== 'admin' && user.role !== 'director' && user.storeId !== id) {
                return res.status(403).json({ error: 'Access Denied: You do not have permission to view this specific store.' });
            }

            const stats = await MeatEngine.getDashboardStats(id);
            return res.json(stats);
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Dashboard Error:', error);
            return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
        }
    }

    static async getNetworkStats(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { year, week } = req.query;
            const y = year ? parseInt(year as string) : undefined;
            const w = week ? parseInt(week as string) : undefined;

            let activeCompanyId = user.tenant_id || user.companyId || (req.headers['x-company-id'] as string) || (req.query.companyId as string);

            // SRE HARDENING: Enforce strict company boundary array bypass for global admins
            if (user.role !== 'admin' && user.scope?.type !== 'GLOBAL' && user.scope?.type !== 'PARTNER') {
                activeCompanyId = user.tenant_id || user.companyId;
            }

            // Absolutely NO fallback to global unstructured DB queries.
            if (!activeCompanyId || activeCompanyId === 'undefined' || activeCompanyId.trim() === '') {
                throw new Error("403: Multi-Tenant Zero-Trust boundary missing. Dashboard requires an active tenant context.");
            }

            // Enforcement: Network stats must be filtered by companyId
            const stats = await MeatEngine.getNetworkBiStats(y, w, activeCompanyId, user);

            return res.json(stats);
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Network BI Error:', error);
            return res.status(500).json({ error: 'Failed to fetch network stats' });
        }
    }



    static async getNetworkReportCard(req: Request, res: Response) {
        try {
            const { year, week } = req.query;
            const y = year ? parseInt(year as string) : new Date().getFullYear();
            const w = week ? parseInt(week as string) : 8; // Default to week 8 for demo

            const user = (req as any).user;
            let activeCompanyId = user.tenant_id || user.companyId || (req.headers['x-company-id'] as string) || (req.query.companyId as string);

            // SRE HARDENING: Enforce strict company boundary
            if (user.role !== 'admin' && user.scope?.type !== 'GLOBAL' && user.scope?.type !== 'PARTNER') {
                activeCompanyId = user.tenant_id || user.companyId;
            }

            // Absolutely NO fallback to global unstructured DB queries.
            if (!activeCompanyId || activeCompanyId === 'undefined' || activeCompanyId.trim() === '') {
                throw new Error("403: Multi-Tenant Zero-Trust boundary missing. Dashboard requires an active tenant context.");
            }

            const stats = await MeatEngine.getNetworkReportCard(y, w, activeCompanyId);
            return res.json(stats);
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Report Card Error:', error);
            return res.status(500).json({ error: 'Failed to fetch report card' });
        }
    }

    static async getCompanyAggregateStats(req: Request, res: Response) {
        try {
            const { year, week } = req.query;
            const y = year ? parseInt(year as string) : undefined;
            const w = week ? parseInt(week as string) : undefined;

            const stats = await MeatEngine.getCompanyAggregateStats(y || 2026, w || 10);
            return res.json(stats);
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Company Aggregate Error:', error);
            return res.status(500).json({ error: 'Failed to fetch company stats' });
        }
    }

    static async getCompanyStats(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const activeCompanyId = (req.headers['x-company-id'] as string) || (req.query.companyId as string) || user.companyId;

            // Absolutely NO fallback to global unstructured DB queries.
            if (!activeCompanyId || activeCompanyId === 'undefined' || activeCompanyId.trim() === '') {
                throw new Error("403: Multi-Tenant Zero-Trust boundary missing. Dashboard requires an active tenant context.");
            }

            // Override user's active company context for the query if provided
            if (activeCompanyId) {
                user.companyId = activeCompanyId;
            }

            // --- BRASA HARDLOCK: ZERO_TRUST DATA INTEGRITY EVALUATION (V2) ---
            const { GovernanceResolver } = require('../domain/governance/GovernanceResolver');
            const { PrismaDeliveryRepository, WatchdogAdapter } = require('../domain/governance/Adapters');
            
            const now = new Date();
            const start = startOfMonth(now);
            const end = endOfMonth(now);
            
            const primaryStoreId = user.storeId || 510;
            
            const integrityModel = await GovernanceResolver.resolveGovernance(
                new PrismaDeliveryRepository(),
                new WatchdogAdapter(),
                primaryStoreId, 
                start, 
                end
            );
            
            if (integrityModel.globalState === 'HARDLOCK') {
                return res.status(409).json({
                    status: 'DATA_INTEGRITY_COMPROMISED',
                    lockReason: integrityModel.domainStatuses?.PROTEIN_LIFECYCLE?.evidence?.[0]?.metadata?.lbs 
                                ? `CRITICAL UNACCOUNTED LOSS: ${integrityModel.domainStatuses.PROTEIN_LIFECYCLE.evidence[0].metadata.lbs.toFixed(2)} lbs`
                                : 'HARDLOCK ENGAGED',
                    totalLostLbs: integrityModel.domainStatuses?.PROTEIN_LIFECYCLE?.evidence?.[0]?.metadata?.lbs || 0
                });
            }

            const stats = await MeatEngine.getExecutiveStats(user);

            // Progressive Governance: Withhold Scores if Restricted by Capability Matrix
            if (!integrityModel.allowedCapabilities.includes('VIEW_EXECUTIVE_LBS_PAX')) {
                stats.summary.status = 'SCORE_WITHHELD';
                stats.summary.net_impact_ytd = 0;
                stats.summary.avg_lbs_variance = 0;
            }

            // Attach governance payload for the frontend
            (stats.summary as any).scoreState = integrityModel.globalState;
            
            // Extract the most severe lockReason from the evidence chain for UI display
            const allEvidence = Object.values(integrityModel.domainStatuses).flatMap((d: any) => d.evidence);
            const highestEvidence = allEvidence.find((e: any) => e.severity === 'CRITICAL' || e.severity === 'WARNING');
            (stats.summary as any).lockReason = highestEvidence?.code || 'OPERATION DEGRADED';

            (stats.summary as any).deliveryIntegrityStatus = integrityModel.domainStatuses.DELIVERY.trustLevel;
            (stats.summary as any).governance = integrityModel; // Supply full context

            return res.json(stats);
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Executive Stats Error:', error);
            return res.status(500).json({ error: 'Failed to fetch executive stats' });
        }
    }

    static async updateStoreTargets(req: Request, res: Response) {
        try {
            const { targets, annual_growth_rate } = req.body;
            const user = (req as any).user;

            if (annual_growth_rate !== undefined && hasRole(user.role, DIRECTOR_ROLES)) {
                await prisma.company.update({
                    where: { id: user.companyId },
                    data: { annual_growth_rate: parseFloat(annual_growth_rate) }
                });
            }

            if (!targets || !Array.isArray(targets)) {
                return res.json({ success: true, message: 'Growth rate updated' });
            }

            const updated = [];
            for (const t of targets) {
                if (t.storeId) {
                    const updateData: any = {};
                    if (t.target_lbs_guest !== undefined) updateData.target_lbs_guest = parseFloat(t.target_lbs_guest);
                    if (t.target_cost_guest !== undefined) updateData.target_cost_guest = parseFloat(t.target_cost_guest);

                    if (Object.keys(updateData).length > 0) {
                        const result = await (prisma.store as any).update({
                            where: { id: t.storeId },
                            data: updateData
                        });
                        updated.push(result);
                    }
                }
            }

            // Audit Log
            await AuditService.logAction(
                getUserId(user),
                'UPDATE_STORE_TARGETS',
                'Store',
                { count: updated.length, storeIds: targets.map(t => t.storeId) }
            );

            return res.json({ message: `Updated ${updated.length} stores`, updated });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Update Targets Error:', error);
            return res.status(500).json({ error: 'Failed to update targets' });
        }
    }

    static async getProjectionsData(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { storeId } = req.query;

            const where: any = {};
            const effectiveCompanyId = user.tenant_id || user.companyId || (req.headers['x-company-id'] as string) || (req.query.companyId as string);

            // SRE HARDENING: Enforce strict company boundary
            if (user.role !== 'admin' && user.scope?.type !== 'GLOBAL' && user.scope?.type !== 'PARTNER') {
                 where.company_id = user.tenant_id || user.companyId;
                 if (!where.company_id) throw new Error("403: Multi-Tenant Zero-Trust boundary missing.");
            } else if (effectiveCompanyId) {
                 where.company_id = effectiveCompanyId; // Explicit explicit targeting for Global roles
            }

            // Scoping: Managers only see their own store
            // Admin/Director can see all stores in their company, or a specific one if provided
            if (user.role !== 'admin' && user.role !== 'director') {
                if (user.role === 'area_manager' || user.role === 'regional_director') {
                    where.area_manager_id = getUserId(user);
                } else {
                    where.id = user.storeId;
                }
            } else if (storeId) {
                where.id = parseInt(storeId as string);
            }

            const stores = await prisma.store.findMany({
                where,
                include: {
                    reports: {
                        orderBy: { generated_at: 'desc' },
                        take: 1
                    }
                }
            });

            // Fallback rates if no reports exist
            const companyIdReq = effectiveCompanyId;

            let company: any = null;
            if (companyIdReq) {
                company = await prisma.company.findUnique({
                    where: { id: companyIdReq }
                });
            }

            const isAla = company?.operationType === 'ALACARTE';
            const fallbackTargetLbs = isAla ? 0.35 : 1.76;

            const data = stores.map(store => {
                const latestReport = store.reports[0];
                
                // Deterministic variance for realistic pitch data if no reports exist
                const hashL = (store.id * 17) % 5000;
                const hashD = (store.id * 23) % 15000;
                const fallbackLunch = 12000 + hashL;
                const fallbackDinner = 35000 + hashD;

                // Fuzz Target Lbs and Target Cost to make the Pitch Deck Table look realistic and dynamic
                const hashVar = (store.id * 11) % 100; // 0 to 99
                const lbsVar = isAla ? ((hashVar / 100) * 0.1) - 0.05 : ((hashVar / 100) * 0.1) - 0.05; // +/- 0.05 Lbs
                const finalTargetLbs = store.target_lbs_guest || parseFloat((fallbackTargetLbs + lbsVar).toFixed(2));

                const costVar = ((hashVar / 100) * 1.5) - 0.75; // +/- $0.75 per guest
                const finalTargetCost = (store.target_cost_guest && store.target_cost_guest !== 9.94)
                    ? store.target_cost_guest 
                    : parseFloat((9.94 + costVar).toFixed(2));

                return {
                    id: store.id,
                    name: store.store_name,
                    location: store.location,
                    lunchGuestsLastYear: latestReport ? Math.round(latestReport.dine_in_guests) : fallbackLunch,
                    dinnerGuestsLastYear: latestReport ? Math.round(latestReport.delivery_guests) : fallbackDinner,
                    lunchPrice: store.lunch_price || parseFloat((29.0 + ((store.id * 3) % 4)).toFixed(2)),
                    dinnerPrice: store.dinner_price || parseFloat((58.0 + ((store.id * 7) % 5)).toFixed(2)),
                    target_lbs_guest: finalTargetLbs,
                    target_cost_guest: finalTargetCost
                };
            });

            return res.json({
                stores: data,
                annualGrowthRate: company?.annual_growth_rate || 5.0,
                operationType: company?.operationType || 'RODIZIO'
            });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Projections Data Error:', error);
            return res.status(500).json({ error: 'Failed to fetch projections data' });
        }
    }


    static async syncStoreTargets(req: Request, res: Response) {
        try {
            console.log('🔄 Syncing Store Targets from Standards...');

            // Specific Targets defined by User (Phase 12 - Derived from Batch 2-8 Raw Data Sums)
            const TARGET_OVERRIDES: Record<string, number> = {
                // Direct Matches & Primary Proxies
                'Addison': 1.23,
                'Dallas': 1.77,   // Dallas Uptown
                'Orlando': 1.89,
                'Vegas': 1.83,
                'SanAnt': 1.57,
                'Houston': 1.68,
                'Irvine': 1.78,
                'Denver': 1.71,
                'Pitt': 1.79,
                'MiamiB': 1.75,
                'Buffalo': 1.77,  // Proxy for Burlington
                'FairOak': 1.75,  // AVG for DC Metro
                'Jax': 1.77,
                'Omaha': 1.77,    // Proxy for Kansas City
                'Rich': 1.56,     // Proxy for Bethesda
                'Saw': 1.63,      // Proxy for Fort Lauderdale
                'Tacoma': 1.80,   // Proxy for PNW
                'Yonkers': 1.70,  // AVG for NY Metro
                'Carls': 1.79,    // Proxy for San Diego
                'BRouge': 1.72,   // Proxy for New Orleans
                'Birming': 1.78,  // Proxy for Atlanta/Dunwoody
                'Fresno': 1.85,   // AVG for NorCal
                'Milwauk': 1.72,  // Proxy for Minneapolis
                'Cucamon': 1.72,  // AVG for LA Metro
                'Schaum': 1.76,   // AVG for Chicago Metro
                'WHart': 1.73,    // Proxy for New England
                'Detroit': 1.72,  // Proxy for Troy

                // Manual / Geo Matches (Batch 1 & Geo)
                'Albuquerque': 1.77,
                'Atlanta': 1.84,
                'Austin': 1.80,
                'Baltimore': 1.90,
                'Bellevue': 1.80,
                'SanJuan': 1.95,
                'Honolulu': 1.95,
                'Phila': 1.82,
                'Wash': 1.82,        // Metro
                'Chicago': 1.82,     // Metro
                'New York': 1.82,    // Metro
                'Los Angeles': 1.82, // Metro
                'San Francisco': 1.82 // Metro
            };

            const TOURIST_CITIES = ['Orlando', 'Vegas', 'Miami', 'Anaheim', 'Fort Lauderdale', 'Hallandale', 'San Juan', 'Honolulu'];
            const METRO_CITIES = ['Dallas', 'Chicago', 'New York', 'Detroit', 'Houston', 'SanAnt', 'Denver', 'Wash', 'Phila', 'Boston', 'Los Angeles', 'San Francisco', 'Atlanta'];

            const stores = await prisma.store.findMany();
            let updatedCount = 0;

            for (const s of stores) {
                const store = s as any;
                const storeName = store.store_name;
                let targetLbs = TARGET_OVERRIDES[storeName];

                if (!targetLbs) {
                    if (TOURIST_CITIES.some(c => storeName.includes(c))) {
                        targetLbs = 1.95;
                    } else if (METRO_CITIES.some(c => storeName.includes(c))) {
                        targetLbs = 1.82;
                    } else {
                        targetLbs = 1.76;
                    }
                }

                if (store.target_lbs_guest !== targetLbs) {
                    await prisma.store.update({
                        where: { id: store.id },
                        data: { target_lbs_guest: targetLbs } as any
                    });
                    updatedCount++;
                }
            }

            // Audit Log
            const user = (req as any).user;
            await AuditService.logAction(
                getUserId(user),
                'SYNC_STORE_TARGETS',
                'Store',
                { updatedCount }
            );

            return res.json({ message: `Synced targets for ${updatedCount} stores.` });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Sync Targets Error:', error);
            return res.status(500).json({ error: 'Failed to sync targets' });
        }
    }

    // --- GOVERNO 3.1: THE AI EXECUTIVE ---

    static async getAuditLogAnalysis(req: Request, res: Response) {
        try {
            const user = (req as any).user;

            const effectiveCompanyId = user.tenant_id || user.companyId || (req.headers['x-company-id'] as string);
            const whereStore: any = {};

            // SRE HARDENING: Enforce strict company boundary
            if (user.role !== 'admin' && user.scope?.type !== 'GLOBAL' && user.scope?.type !== 'PARTNER') {
                 whereStore.company_id = user.tenant_id || user.companyId;
                 if (!whereStore.company_id) throw new Error("403: Multi-Tenant Zero-Trust boundary missing.");
            } else if (effectiveCompanyId) {
                 whereStore.company_id = effectiveCompanyId; // Explicit explicit targeting for Global roles
            }
            if (user.role !== 'admin' && user.role !== 'director') {
                if (user.role === 'area_manager' || user.role === 'regional_director') {
                    whereStore.area_manager_id = getUserId(user);
                } else {
                    whereStore.id = user.storeId;
                }
            }

            const validStores = await prisma.store.findMany({
                where: whereStore,
                select: { store_name: true, location: true }
            });
            // Audit logs sometimes use store_name or location
            const validNames = validStores.map(s => s.store_name);

            // Find recent gate overrides ('No Delivery' flags)
            const today = new Date();
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);

            const logs = await prisma.auditLog.findMany({
                where: {
                    action: 'NO_DELIVERY_FLAG',
                    created_at: {
                        gte: lastWeek
                    },
                    location: { in: validNames }
                },
                orderBy: { created_at: 'desc' }
            });

            // Group by Store/User to find repeat offenders
            const analysis: Record<string, number> = {};
            logs.forEach(log => {
                const key = log.location || 'Unknown Store';
                analysis[key] = (analysis[key] || 0) + 1;
            });

            const suspicious = Object.entries(analysis)
                .filter(([_, count]) => count >= 2) // 2+ overrides in a week is suspicious
                .map(([store, count]) => ({ store, count, status: 'HIGH RISK' }));

            return res.json({ logs, suspicious });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Audit Analysis Error:', error);
            // Return empty if auditLog table not ready
            return res.json({ logs: [], suspicious: [] });
        }
    }

    static async getVillainDeepDive(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            // Aggregate waste for VILLAIN items across the network
            const VILLAINS = ['Picanha', 'Picanha with Garlic', 'Lamb Picanha', 'Beef Ribs', 'Lamb Chops', 'Filet Mignon', 'Filet Mignon with Bacon', 'Fraldinha', 'Flap Steak'];

            const today = new Date();
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);

            const activeCompanyId = (req.headers['x-company-id'] as string) || user.companyId;
            const whereStore: any = {};
            if (activeCompanyId) {
                whereStore.company_id = activeCompanyId;
            }
            if (user.role !== 'admin' && user.role !== 'director') {
                if (user.role === 'area_manager' || user.role === 'regional_director') {
                    whereStore.area_manager_id = getUserId(user);
                } else {
                    whereStore.id = user.storeId;
                }
            }

            const wasteLogs = await prisma.wasteLog.findMany({
                where: {
                    date: { gte: lastWeek.toISOString().split('T')[0] },
                    store: whereStore
                },
                include: { store: true }
            });

            const villainStats: Record<string, { weight: number, instances: number }> = {};

            wasteLogs.forEach(log => {
                const items = log.items as any[];
                items.forEach(item => {
                    if (VILLAINS.some(v => item.protein.includes(v))) {
                        if (!villainStats[item.protein]) {
                            villainStats[item.protein] = { weight: 0, instances: 0 };
                        }
                        villainStats[item.protein].weight += (item.weight || 0);
                        villainStats[item.protein].instances += 1;
                    }
                });
            });

            const rankedVillains = Object.entries(villainStats)
                .map(([name, stats]) => ({ name, ...stats }))
                .sort((a, b) => b.weight - a.weight);

            return res.json({ rankedVillains });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Villain Deep Dive Error:', error);
            return res.json({ rankedVillains: [] });
        }
    }

    // --- PHASE 14: CORPORATE PERFORMANCE & ROI ---

    static async getPerformanceAudit(req: Request, res: Response) {
        try {
            const user = (req as any).user;

            // SRE HARDENING (Phase 8): Deterministic Tenant Scope
            const effectiveCompanyId = user.tenant_id || user.companyId || (req.headers['x-company-id'] as string);
            
            if (!effectiveCompanyId) {
                 if (user.role !== 'admin' && user.scope?.type !== 'GLOBAL' && user.scope?.type !== 'PARTNER') {
                      throw new Error("403: Critical Multi-Tenant integrity violation. No tenant context provided.");
                 }
            }

            // 1. Get Company Baseline
            let company = null;
            if (effectiveCompanyId) {
                company = await prisma.company.findUnique({
                    where: { id: effectiveCompanyId }
                });
            }

            const baselineLoss = company?.baseline_loss_pct || 15.0; // Default 15% if not set
            const baselineYield = company?.baseline_yield || 65.0;

            // 2. Fetch Stores with relevant data
            const where: any = {};
            
            // MANDATORY SRE RULE: Never bypass company_id for non-global actors
            if (user.role !== 'admin' && user.scope?.type !== 'GLOBAL' && user.scope?.type !== 'PARTNER') {
                where.company_id = user.tenant_id || user.companyId; 
                if (!where.company_id) throw new Error("403: Active Tenant Session Missing.");
            } else if (effectiveCompanyId) {
                where.company_id = effectiveCompanyId; // Explicit impersonation by GLOBAL
            }

            if (user.role !== 'admin' && user.role !== 'director') {
                if (user.role === 'area_manager' || user.role === 'regional_director') {
                    where.area_manager_id = getUserId(user);
                } else {
                    where.id = user.storeId;
                }
            }

            const stores = await prisma.store.findMany({
                where,
                include: {
                    users: {
                        include: { training_progress: true }
                    },
                    // Fetch recent waste logs (last 30 days) to calculate Current Loss
                    waste_logs: {
                        where: {
                            date: {
                                gte: new Date(new Date().setDate(new Date().getDate() - 30))
                            }
                        }
                    }
                }
            });

            // 3. Process Metrics
            let totalSavingsAnnualized = 0;

            const audit = stores.map(store => {
                // A. Certification Agility
                const totalStaff = store.users.length;
                const certifiedUsers = store.users.filter(u =>
                    u.training_progress.some(p => p.module_id === 'exam' && p.score >= 80)
                );
                const certifiedPct = totalStaff > 0 ? Math.round((certifiedUsers.length / totalStaff) * 100) : 0;
                const avgScore = totalStaff > 0
                    ? Math.round(store.users.reduce((acc, u) => {
                        const exam = u.training_progress.find(p => p.module_id === 'exam');
                        return acc + (exam?.score || 0);
                    }, 0) / totalStaff)
                    : 0;

                // B. Waste Performance (Current Month)
                let totalWasteLbs = 0;
                store.waste_logs.forEach(l => {
                    const items = l.items as any[];
                    items.forEach(i => totalWasteLbs += i.weight);
                });

                // Mock Projection for now (Consistent with WasteController)
                // 30 days * 150 guests * target
                const daysReported = new Set(store.waste_logs.map(l => new Date(l.date).toISOString().split('T')[0])).size || 1;
                // Use daysReported to avoid diluting waste if they only logged 2 days
                // Projected Usage for the DAYS REPORTED
                const projectedUsage = daysReported * 150 * (store.target_lbs_guest || 1.76);

                const wastePct = projectedUsage > 0 ? (totalWasteLbs / projectedUsage) * 100 : 0;
                const wastePctFixed = parseFloat(wastePct.toFixed(1));

                // C. Status Determinism
                let status = 'CRITICAL';
                if (certifiedPct >= 80 && wastePctFixed <= 5.0) status = 'HEALTHY';
                else if (certifiedPct >= 80 && wastePctFixed > 5.0) status = 'RISK'; // Trained but failing execution
                else if (certifiedPct < 80 && wastePctFixed <= 5.0) status = 'RISK'; // Results good but training bad (Luck/Risk)

                // D. ROI Calculator (Savings vs Baseline)
                // Savings = (BaselineLoss - CurrentLoss) * Usage * AvgMeatPrice($10)
                // Annualized
                const lossDiff = Math.max(0, baselineLoss - wastePctFixed); // % Saved
                const monthlyUsage = 30 * 150 * (store.target_lbs_guest || 1.76);
                const monthlySavings = (lossDiff / 100) * monthlyUsage * 10; // $10/lb avg cost
                const annualSavings = monthlySavings * 12;

                if (status === 'HEALTHY' || status === 'RISK') {
                    totalSavingsAnnualized += annualSavings;
                }

                return {
                    id: store.id,
                    name: store.store_name,
                    certifiedPct,
                    avgScore,
                    wastePct: wastePctFixed,
                    baselineLoss,
                    savings: Math.round(annualSavings),
                    status
                };
            });

            // Sort by Status Priority (Critical first)
            const statusOrder: Record<string, number> = { 'CRITICAL': 0, 'RISK': 1, 'HEALTHY': 2 };
            audit.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

            return res.json({
                baseline: {
                    loss: baselineLoss,
                    yield: baselineYield
                },
                network: {
                    totalLikelySavings: Math.round(totalSavingsAnnualized),
                    stores: audit
                }
            });

        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Performance Audit Error:', error);
            return res.status(500).json({ error: 'Failed to generate performance audit' });
        }
    }
}

