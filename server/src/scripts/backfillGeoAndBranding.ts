// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Backfill Geo Coordinates and Branding

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function runGeoAndBrandingBackfill() {
    console.log('[BACKFILL] Starting deterministic geo and branding backfill...');

    // 1. Branding Backfill
    const companyBrandings = [
        { match: 'chima', logo: '/chima-logo.svg', color: '#8B0000' },
        { match: 'terra', logo: 'https://terragaucha.com/wp-content/uploads/2024/08/logo-terra-final-11.svg', color: '#2D5A27' },
        { match: 'adega', logo: '/adega-logo.png', color: '#1B365D' },
        { match: 'hard rock', logo: '/hardrock_logo.png', color: '#FFD700' },
        { match: 'hardrock', logo: '/hardrock_logo.png', color: '#FFD700' },
        { match: 'texas', logo: '/tdb-logo-white.svg', color: '#9B111E' },
        { match: 'fogo', logo: '/fdc-logo-pure-white.png', color: '#A31D21' },
        { match: 'outback', logo: '/outback-logo.svg', color: '#CE1226' },
        { match: 'brasa', logo: '/brasa-logo-v3.png', color: '#C5A059' }
    ];

    for (const branding of companyBrandings) {
        const companies = await prisma.company.findMany({
            where: {
                OR: [
                    { subdomain: branding.match },
                    { name: { contains: branding.match, mode: 'insensitive' } }
                ]
            }
        });

        for (const co of companies) {
            await prisma.company.update({
                where: { id: co.id },
                data: {
                    theme_logo_url: co.theme_logo_url || branding.logo,
                    theme_primary_color: co.theme_primary_color || branding.color
                }
            });
            console.log(`[BACKFILL] Updated branding for ${co.name} (${co.subdomain}): logo=${branding.logo}`);
        }
    }

    // 2. Chima Geo Backfill
    const chimaCompany = await prisma.company.findFirst({
        where: { OR: [{ subdomain: 'chima' }, { name: { contains: 'chima', mode: 'insensitive' } }] },
        include: { stores: true }
    });

    if (chimaCompany) {
        const chimaCoords: Record<string, { lat: number; lng: number }> = {
            'fort lauderdale': { lat: 26.1224, lng: -80.1373 },
            'orlando': { lat: 28.4485, lng: -81.4700 },
            'charlotte': { lat: 35.2271, lng: -80.8431 },
            'tysons': { lat: 38.9187, lng: -77.2311 }
        };

        for (const store of chimaCompany.stores) {
            const normName = store.store_name.toLowerCase();
            let matched = false;
            for (const [key, coords] of Object.entries(chimaCoords)) {
                if (normName.includes(key)) {
                    await prisma.store.update({
                        where: { id: store.id },
                        data: {
                            latitude: coords.lat,
                            longitude: coords.lng,
                            status: 'ACTIVE'
                        }
                    });
                    console.log(`[BACKFILL] Updated Chima Store [${store.id}] ${store.store_name}: lat=${coords.lat}, lng=${coords.lng}`);
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                console.log(`[BACKFILL] Chima Store [${store.id}] ${store.store_name}: GEO_REQUIRES_REVIEW`);
            }
        }
    }

    // 3. Terra Gaúcha Geo Backfill
    const terraCompany = await prisma.company.findFirst({
        where: { OR: [{ subdomain: 'terragaucha' }, { name: { contains: 'terra', mode: 'insensitive' } }] },
        include: { stores: true }
    });

    if (terraCompany) {
        const terraCoords: Record<string, { lat: number; lng: number }> = {
            'jacksonville': { lat: 30.2520, lng: -81.5540 },
            'tampa': { lat: 27.9254, lng: -82.5065 },
            'stamford': { lat: 41.0526, lng: -73.5382 },
            'indianapolis': { lat: 39.9137, lng: -86.1061 },
            'omaha': { lat: 41.2619, lng: -96.1264 },
            'rockville': { lat: 39.0566, lng: -77.1213 }
        };

        for (const store of terraCompany.stores) {
            const normName = store.store_name.toLowerCase();
            for (const [key, coords] of Object.entries(terraCoords)) {
                if (normName.includes(key)) {
                    await prisma.store.update({
                        where: { id: store.id },
                        data: {
                            latitude: coords.lat,
                            longitude: coords.lng,
                            status: 'ACTIVE'
                        }
                    });
                    console.log(`[BACKFILL] Updated Terra Store [${store.id}] ${store.store_name}: lat=${coords.lat}, lng=${coords.lng}`);
                    break;
                }
            }
        }
    }

    // 4. Adega Gaúcha Geo Backfill
    const adegaCompany = await prisma.company.findFirst({
        where: { OR: [{ subdomain: 'adega' }, { name: { contains: 'adega', mode: 'insensitive' } }] },
        include: { stores: true }
    });

    if (adegaCompany) {
        const adegaCoords: Record<string, { lat: number; lng: number }> = {
            'orlando': { lat: 28.4485, lng: -81.3963 },
            'kissimmee': { lat: 28.3444, lng: -81.5975 },
            'deerfield': { lat: 26.3150, lng: -80.0910 }
        };

        for (const store of adegaCompany.stores) {
            const normName = store.store_name.toLowerCase();
            for (const [key, coords] of Object.entries(adegaCoords)) {
                if (normName.includes(key)) {
                    await prisma.store.update({
                        where: { id: store.id },
                        data: {
                            latitude: coords.lat,
                            longitude: coords.lng,
                            status: 'ACTIVE'
                        }
                    });
                    console.log(`[BACKFILL] Updated Adega Store [${store.id}] ${store.store_name}: lat=${coords.lat}, lng=${coords.lng}`);
                    break;
                }
            }
        }
    }

    // 5. Hard Rock Cafe Geo Backfill
    const hardrockCompany = await prisma.company.findFirst({
        where: { OR: [{ subdomain: 'hardrock' }, { name: { contains: 'hard rock', mode: 'insensitive' } }] },
        include: { stores: true }
    });

    if (hardrockCompany) {
        const hrCoords: Record<string, { lat: number; lng: number }> = {
            'tampa': { lat: 27.9890, lng: -82.3735 },
            'hollywood': { lat: 26.0461, lng: -80.2096 },
            'atlantic city': { lat: 39.3597, lng: -74.4229 },
            'punta cana': { lat: 18.7301, lng: -68.5303 }
        };

        for (const store of hardrockCompany.stores) {
            const normName = store.store_name.toLowerCase();
            for (const [key, coords] of Object.entries(hrCoords)) {
                if (normName.includes(key)) {
                    await prisma.store.update({
                        where: { id: store.id },
                        data: {
                            latitude: coords.lat,
                            longitude: coords.lng,
                            status: 'ACTIVE'
                        }
                    });
                    console.log(`[BACKFILL] Updated Hard Rock Store [${store.id}] ${store.store_name}: lat=${coords.lat}, lng=${coords.lng}`);
                    break;
                }
            }
        }
    }

    console.log('[BACKFILL] Completed deterministic backfill successfully.');
}

if (require.main === module) {
    runGeoAndBrandingBackfill()
        .catch(err => {
            console.error('[BACKFILL_ERROR]', err);
            process.exit(1);
        })
        .finally(() => prisma.$disconnect());
}
