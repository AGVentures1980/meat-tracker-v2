export interface RawDashboardPayload {
    performance?: any[];
    summary?: any;
    anomalies?: any[];
    suggestions?: any[];
}

const safeNumber = (val: any): { value: number; formatted: string; isValid: boolean } => {
    if (val === null || val === undefined || isNaN(val) || val === 0) {
        return { value: 0, formatted: '-', isValid: false };
    }
    return { value: Number(val), formatted: Number(val).toFixed(2), isValid: true };
};

const safeCurrency = (val: any): { value: number; formatted: string; isValid: boolean } => {
    if (val === null || val === undefined || isNaN(val) || val === 0) {
        return { value: 0, formatted: '-', isValid: false };
    }
    return { value: Number(val), formatted: '$' + Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), isValid: true };
};

export const executiveAdapters = {
    toSnapshot: (summary: any, performance: any[]) => {
        const exposure = safeCurrency(summary?.villain_impact);
        const lbsGuest = safeNumber(summary?.net_lbs_pax);
        const costGuest = safeCurrency(summary?.net_cost_pax);
        const storesOff = performance?.filter(p => p.status === 'Critical' || p.status === 'Warning').length || 0;
        
        return {
            financialExposure: { ...exposure, fallback: 'Data aggregation in progress' },
            lbsPerGuest: { ...lbsGuest, fallback: 'Partial data - pilot mode' },
            costPerGuest: { ...costGuest, fallback: 'Partial data - pilot mode' },
            storesOffTarget: { value: storesOff, formatted: storesOff.toString(), isValid: storesOff > 0 || performance?.length > 0, fallback: 'Partial data - pilot mode' },
            recoveredSavings: { value: 0, formatted: '-', isValid: false, fallback: 'Data aggregation in progress' }, // Strict adherence to NO 0.00 fiction
        };
    },
    toMarginLeakage: (anomalies: any[], performance: any[]) => {
        // Extract root causes instead of raw numbers
        const causes = [];
        const hasCritical = performance?.some(p => p.status === 'Critical');
        
        if (hasCritical) causes.push("Yield drift detected in high-volume stores.");
        if (anomalies?.some(a => a.type === 'QC_ALERT')) causes.push("Receiving variance blocked by Governance.");
        
        return causes;
    },
    toPriorityStores: (performance: any[]) => {
        if (!performance) return [];
        return performance
            .filter(p => safeCurrency(p.impactYTD).isValid)
            .sort((a, b) => b.impactYTD - a.impactYTD)
            .slice(0, 5)
            .map(p => ({
                storeId: p.id,
                name: p.name,
                region: p.location,
                riskLevel: p.status === 'Critical' ? 'CRITICAL' : 'HIGH',
                exposure: safeCurrency(p.impactYTD).formatted,
                lastUpdate: 'LIVE'
            }));
    },
    toCriticalAnomalies: (anomalies: any[]) => {
        if (!anomalies) return [];
        return anomalies.map(a => ({
            id: a.id || a.name,
            level: a.type === 'QC_ALERT' ? 'CRITICAL' : 'HIGH',
            title: a.name,
            description: a.type === 'QC_ALERT' ? 'Garcia Rule Triggered' : `Variance deviation: ${a.variance}%`
        }));
    },
    toRecommendedActions: (anomalies: any[], performance: any[]) => {
        const acts = [];
        if (performance?.some(p => p.status === 'Critical')) acts.push("Review yield logs for Critical stores immediately.");
        if (anomalies?.some(a => a.type === 'QC_ALERT')) acts.push("Reconcile receiving exceptions.");
        return acts;
    }
};

export const regionalAdapters = {
    toSnapshot: (summary: any, performance: any[], regionId: string) => {
        // Filter strictly inside the adapter
        const regionalStores = performance?.filter(p => !regionId || p.regionId === regionId) || [];
        
        const safeLbs = safeNumber(regionalStores.reduce((acc, curr) => acc + (curr.lbsPerGuest || 0), 0) / (regionalStores.length || 1));
        const safeCost = safeCurrency(regionalStores.reduce((acc, curr) => acc + (curr.costPerGuest || 0), 0) / (regionalStores.length || 1));
        
        return {
            regionExposure: { value: 0, formatted: '-', isValid: false, fallback: 'Data aggregation in progress' },
            storesUnderWatch: { value: regionalStores.filter(p => p.status !== 'Optimal').length, formatted: regionalStores.filter(p => p.status !== 'Optimal').length.toString(), isValid: regionalStores.length > 0, fallback: 'Data aggregation in progress' },
            avgLbsGuest: { ...safeLbs, fallback: 'Partial data - pilot mode' },
            avgCostGuest: { ...safeCost, fallback: 'Partial data - pilot mode' },
            weeklyRecovery: { value: 0, formatted: '-', isValid: false, fallback: 'Partial data - pilot mode' },
        };
    },
    toBestWorst: (performance: any[], regionId: string) => {
        const regionalStores = (performance?.filter(p => !regionId || p.regionId === regionId) || [])
            .filter(p => p.lbsPerGuest > 0);
        
        const sorted = [...regionalStores].sort((a, b) => a.lbsPerGuest - b.lbsPerGuest);
        return {
            best: sorted.slice(0, 3).map(s => ({ name: s.name, metric: safeNumber(s.lbsPerGuest).formatted })),
            worst: sorted.slice(-3).reverse().map(s => ({ name: s.name, metric: safeNumber(s.lbsPerGuest).formatted }))
        };
    },
    toOutlierBoard: (anomalies: any[]) => {
        if (!anomalies) return [];
        return anomalies.map(a => a.type === 'QC_ALERT' ? 'Receiving issue' : 'Yield issue');
    },
    toCoachingQueue: (performance: any[]) => {
        return performance?.filter(p => p.status === 'Critical').map(p => `Visit store: ${p.name}`);
    }
};

export const storeAdapters = {
    toSnapshot: (performance: any[], storeId: string) => {
        const store = performance?.find(p => p.id.toString() === storeId.toString());
        
        return {
            todayScore: { value: 0, formatted: '-', isValid: !!store, fallback: 'Partial data - pilot mode' },
            todayRisk: { value: store?.status || 'UNKNOWN', formatted: store?.status || 'UNKNOWN', isValid: !!store, fallback: 'Data aggregation in progress' },
            lbsGuestToday: { ...safeNumber(store?.lbsPerGuest), fallback: 'Partial data - pilot mode' },
            costGuestToday: { ...safeCurrency(store?.costPerGuest), fallback: 'Partial data - pilot mode' },
            shiftStatus: { value: 'OPEN', formatted: 'OPEN', isValid: true, fallback: 'Live signals active' }
        };
    },
    toNeedsAttention: (anomalies: any[], storeId: string) => {
        const storeAnomalies = anomalies?.filter(a => a.storeId?.toString() === storeId.toString()) || [];
        return storeAnomalies.map(a => a.type === 'QC_ALERT' ? 'Receiving pending validation' : `Variance alert: ${a.name}`);
    },
    toMainRisks: (anomalies: any[]) => {
        if (!anomalies || anomalies.length === 0) return ["Live signals active"];
        return anomalies.map(a => `Risk detected: ${a.name}`);
    }
};
