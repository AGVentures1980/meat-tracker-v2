// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Canonical Tenant Switch Navigation Engine

export interface TenantSwitchTarget {
    id: string;
    name: string;
    subdomain?: string | null;
}

/**
 * Single canonical tenant switching service.
 * Enforces cross-subdomain browser navigation without premature React state mutation.
 */
export function switchTenant(company: TenantSwitchTarget, destinationPath: string = '/dashboard/network'): boolean {
    const targetSubdomain = company.subdomain?.trim().toLowerCase();
    const isValidSubdomain = Boolean(targetSubdomain && /^[a-z0-9-]+$/.test(targetSubdomain));

    if (!isValidSubdomain) {
        console.error('[TENANT_SWITCH] Subdomain unprovisioned or malformed for company:', company);
        alert(`TENANT_SUBDOMAIN_NOT_PROVISIONED: Cannot navigate to tenant dashboard. Subdomain for ${company.name} is missing or unprovisioned.`);
        return false;
    }

    const currentHost = window.location.hostname.toLowerCase();
    const normalizedPath = destinationPath.startsWith('/') ? destinationPath : `/${destinationPath}`;

    // Perform full cross-subdomain browser navigation for production domains
    if (currentHost.includes('.brasameat.com')) {
        const rootDomain = 'brasameat.com';
        const currentSubdomain = currentHost.split(`.${rootDomain}`)[0];
        if (currentSubdomain !== targetSubdomain) {
            const targetUrl = `https://${targetSubdomain}.${rootDomain}${normalizedPath}`;
            console.log(`[TENANT_SWITCH] Navigating to canonical tenant URL: ${targetUrl}`);
            window.location.assign(targetUrl);
            return true;
        }
    } else if (currentHost.includes('.alexgarciaventures.co')) {
        const rootDomain = 'alexgarciaventures.co';
        const currentSubdomain = currentHost.split(`.${rootDomain}`)[0];
        if (currentSubdomain !== targetSubdomain) {
            const targetUrl = `https://${targetSubdomain}.${rootDomain}${normalizedPath}`;
            console.log(`[TENANT_SWITCH] Navigating to canonical tenant URL: ${targetUrl}`);
            window.location.assign(targetUrl);
            return true;
        }
    }

    // Single-origin / localhost / same subdomain fallback:
    const localTargetUrl = `${window.location.protocol}//${window.location.host}${normalizedPath}`;
    console.log(`[TENANT_SWITCH] Navigating locally: ${localTargetUrl}`);
    window.location.assign(localTargetUrl);
    return true;
}
