/**
 * BRASA Dashboard Scope Resolver & Validation Policy
 * Ensures strict Role vs Scope validation and generates isolated cache keys.
 */

export type DashboardViewType = 'EXECUTIVE' | 'REGIONAL' | 'STORE' | 'UNAUTHORIZED' | 'AWAITING_TENANT';

export interface UserContextPayload {
    user: {
        role?: string;
        scope?: { type: string };
        regionId?: string;
    } | null;
    selectedCompany: string | null;
    selectedStore: string | null;
}

export interface ScopeResolutionResult {
    view: DashboardViewType;
    isolationKey: string;
    errorMessage?: string;
}

/**
 * Validates logical consistency between Authorization Role and Scope Type.
 * Prevents escalated rendering if the JWT/state payload is malformed.
 */
export const validateScopeContext = (context: UserContextPayload): { valid: boolean; reason?: string } => {
    const { user, selectedCompany, selectedStore } = context;

    if (!user) return { valid: false, reason: "Missing auth payload" };

    const role = user.role?.toLowerCase() || '';
    const scopeType = user.scope?.type || '';

    // 1. Master Executive bypass check (Top Tier)
    if (scopeType === 'MASTER_EXECUTIVE' && role === 'admin') return { valid: true };

    // 2. Tenant Context is mandatory for ALL roles except absolute MASTER
    if (!selectedCompany && scopeType !== 'MASTER_EXECUTIVE') {
        return { valid: false, reason: "Missing mandatory tenant_id (selectedCompany)" };
    }

    // 3. Role/Scope Consistency Matrix
    const isExecutiveRole = ['admin', 'director', 'vp', 'corporate_director', 'partner'].includes(role);
    const isRegionalRole = ['area_manager', 'regional_director'].includes(role);
    const isStoreRole = ['manager', 'user', 'property_manager', 'executive_chef', 'outlet_manager', 'read_only_viewer'].includes(role);

    if (isExecutiveRole && !['COMPANY', 'TENANT_EXECUTIVE_SCOPE', 'MASTER_EXECUTIVE', 'GLOBAL', 'Global', 'PARTNER'].includes(scopeType.toUpperCase())) {
        return { valid: false, reason: `Consistency Mismatch: Executive role '${role}' cannot have restricted scope '${scopeType}'` };
    }

    if (isRegionalRole && !['AREA', 'COMPANY'].includes(scopeType.toUpperCase())) {
        return { valid: false, reason: `Consistency Mismatch: Regional role '${role}' must be bound to 'AREA' or 'COMPANY' scope.` };
    }

    if (isStoreRole && scopeType !== 'STORE') {
        return { valid: false, reason: `Consistency Mismatch: Tactical role '${role}' must be bound to 'STORE' scope.` };
    }

    // 4. Tactical Data Integrity
    // 4. Tactical Data Integrity
    if (scopeType === 'STORE' && !selectedStore && role !== 'read_only_viewer' && role !== 'property_manager' && role !== 'executive_chef' && role !== 'outlet_manager') {
        return { valid: false, reason: "Tactical Data Integrity: STORE scope invoked without selectedStore" };
    }
    
    if (scopeType === 'AREA' && !user.regionId) {
        return { valid: false, reason: "Tactical Data Integrity: AREA scope invoked without regionId" };
    }

    return { valid: true };
};

/**
 * Resolves the final React Dashboard View based on strictly validated context.
 * Computes an immutable 'isolationKey' used to sandbox Component State/Cache.
 */
export const resolveDashboardView = (context: UserContextPayload): ScopeResolutionResult => {
    const validation = validateScopeContext(context);
    
    if (!validation.valid) {
        if (validation.reason?.includes("missing mandatory tenant_id")) {
            return { view: 'AWAITING_TENANT', isolationKey: 'unresolved-tenant' };
        }
        return { view: 'UNAUTHORIZED', isolationKey: 'unauthorized', errorMessage: validation.reason };
    }

    const { user, selectedCompany, selectedStore } = context;
    const role = user!.role?.toLowerCase() || '';
    const scopeType = user!.scope?.type || '';
    const safeTenant = selectedCompany || 'NO_TENANT_BOUND';
    const regionId = user!.regionId || 'NO_REGION';
    const storeId = selectedStore || 'NO_STORE';

    // 1. EXECUTIVE
    if (['admin', 'director', 'vp', 'partner', 'corporate_director'].includes(role) || ['COMPANY', 'TENANT_EXECUTIVE_SCOPE', 'MASTER_EXECUTIVE', 'GLOBAL', 'Global'].includes(scopeType.toUpperCase())) {
        return { 
            view: 'EXECUTIVE', 
            isolationKey: `tenant:${safeTenant}|view:exec|role:${role}`
        };
    }

    // 2. REGIONAL
    if (['area_manager', 'regional_director'].includes(role) || scopeType === 'AREA') {
        return { 
            view: 'REGIONAL', 
            isolationKey: `tenant:${safeTenant}|view:regional|region:${regionId}|role:${role}`
        };
    }

    // 3. STORE
    if (['manager', 'user', 'property_manager', 'executive_chef', 'outlet_manager', 'read_only_viewer'].includes(role) || scopeType === 'STORE') {
        return { 
            view: 'STORE', 
            isolationKey: `tenant:${safeTenant}|view:store|store:${storeId}|role:${role}`
        };
    }

    return { view: 'UNAUTHORIZED', isolationKey: 'unauthorized', errorMessage: `Unhandled scope logic block. Role: ${role}, Scope: ${scopeType}` };
};
