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
    const timestamp = new Date().toISOString();
    const currentHref = window.location.href;
    const currentHost = window.location.hostname.toLowerCase();
    const targetSubdomain = company.subdomain?.trim().toLowerCase();
    const isValidSubdomain = Boolean(targetSubdomain && /^[a-z0-9-]+$/.test(targetSubdomain));
    const currentSelected = localStorage.getItem('brasameat_selected_company');

    console.log(`[BRASA_TENANT_SWITCH_TRACE] 01 CLICK_RECEIVED timestamp=${timestamp} href=${currentHref} host=${currentHost} targetId=${company.id} targetName=${company.name} targetSubdomain=${company.subdomain} selectedCompany=${currentSelected}`);

    console.log(`[BRASA_TENANT_SWITCH_TRACE] 02 HANDLE_SELECT_ENTER targetSubdomain=${targetSubdomain}`);

    if (!isValidSubdomain) {
        console.error(`[BRASA_TENANT_SWITCH_TRACE] 03 SUBDOMAIN_VALIDATION_FAILED targetSubdomain=${targetSubdomain}`);
        alert(`TENANT_SUBDOMAIN_NOT_PROVISIONED: Cannot navigate to tenant dashboard. Subdomain for ${company.name} is missing or unprovisioned.`);
        return false;
    }

    console.log(`[BRASA_TENANT_SWITCH_TRACE] 03 SUBDOMAIN_VALIDATED value=${targetSubdomain}`);

    const normalizedPath = destinationPath.startsWith('/') ? destinationPath : `/${destinationPath}`;

    let targetUrl = '';
    const navMethod = 'window.location.assign';

    if (currentHost.includes('.brasameat.com')) {
        const rootDomain = 'brasameat.com';
        targetUrl = `https://${targetSubdomain}.${rootDomain}${normalizedPath}`;
    } else if (currentHost.includes('.alexgarciaventures.co')) {
        const rootDomain = 'alexgarciaventures.co';
        targetUrl = `https://${targetSubdomain}.${rootDomain}${normalizedPath}`;
    } else {
        targetUrl = `${window.location.protocol}//${window.location.host}${normalizedPath}`;
    }

    console.log(`[BRASA_TENANT_SWITCH_TRACE] 04 TARGET_URL_BUILT url=${targetUrl} navMethod=${navMethod}`);
    console.log(`[BRASA_TENANT_SWITCH_TRACE] 05 WINDOW_LOCATION_ASSIGN_CALLED targetUrl=${targetUrl}`);

    window.location.assign(targetUrl);
    return true;
}
