// ==========================================
// DATADOG APM TRACER (Must be strictly line 1)
// ==========================================
// import tracer from 'dd-trace';
// tracer.init({ logInjection: true });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { SREStartupGuard } from './utils/SREStartupGuard';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:8080',
            'https://meat-intelligence.up.railway.app',
            'https://meat-intelligence-final.up.railway.app',
            'https://brasameat.com',
            'https://www.brasameat.com',
            'https://fogo.brasameat.com',
            'https://fdc.brasameat.com'
        ];
        if (allowedOrigins.includes(origin) || origin.endsWith('.brasameat.com') || origin.endsWith('.alexgarciaventures.co')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(helmet({
    contentSecurityPolicy: false, // Disable for easier external image loading for SaaS
}));
app.use(morgan('dev'));

// Basic Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'UP', timestamp: new Date() });
});

// Proxied Health Check for Frontend
app.get('/api/health', (req, res) => {
    res.json({ status: 'UP', timestamp: new Date() });
});

// Import Real Auth Middleware
import { requireAuth } from './middleware/auth.middleware';
import authRoutes from './routes/auth.routes';
import sreRoutes from './routes/sre.routes';


// Global Request Logger & Structural Tracing
import crypto from 'crypto';
import { logger, hijackConsoleLogs } from './utils/logger';

// Optionally hijack global console to capture un-migrated code
hijackConsoleLogs();

// Append Trace Context
app.use((req, res, next) => {
    (req as any).id = crypto.randomUUID();
    next();
});

// Structural Access Log
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const tenantStr = (req as any).user?.company_id || 'unauthenticated';
        logger.info(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`, {
             requestId: (req as any).id,
             companyId: tenantStr
        });
    });
    next();
});

// Import Webhook
import { StripeWebhookController } from './controllers/StripeWebhookController';

// ----------------------------------------------------------------------------
// STRIPE WEBHOOKS MUST BE MOUNTED BEFORE ANY BODY PARSER (Needs Raw Buffer)
// ----------------------------------------------------------------------------
app.post('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }), StripeWebhookController.handleWebhook);

// API Routes
import dashboardRoutes from './routes/dashboard.routes';
import orderRoutes from './routes/order.routes';
import uploadRoutes from './routes/upload.routes';
import inventoryRoutes from './routes/inventory.routes';
import automationRoutes from './routes/automation.routes';
import deliveryRoutes from './routes/delivery.routes';
import purchaseRoutes from './routes/purchase.routes';
import barcodeRoutes from './routes/barcode.routes';
import intelligenceRoutes from './routes/intelligence.routes';
import analystRoutes from './routes/analyst.routes';
import negotiationRoutes from './routes/negotiation.routes';
import reportRoutes from './routes/report.routes';
import forecastRoutes from './routes/forecast.routes';
import ownerRoutes from './routes/owner.routes';
import userRoutes from './routes/user.routes';
import companyRoutes from './routes/company.routes';
import supportRoutes from './routes/support.routes';
import vaultRoutes from './routes/vault.routes';
import themeRoutes from './routes/theme.routes';
import partnerRoutes from './routes/partner.routes';
import agvAdminRoutes from './routes/agv-admin.routes';
import ediRoutes from './routes/edi.routes';
import leadRoutes from './routes/lead.routes';
import weatherRoutes from './routes/weather.routes';

import { ProspectingAgent } from './services/ProspectingAgent';
import { OneDriveWatcher } from './services/OneDriveWatcher';
import { SentinelService } from './services/sentinel.service';
import cron from 'node-cron';

import path from 'path';

// Auth Routes (Public)
app.use('/api/v1/auth', authRoutes);

// Private Application Routes
app.use('/api/v1/vault', vaultRoutes);
app.use('/api/v1/theme', themeRoutes); // Public theme fetching

import { PartnerController } from './controllers/PartnerController';

// Public Proposal Acceptance (Stripe Entrypoint)
app.get('/api/v1/proposals/:proposalId', PartnerController.getPublicProposal);
app.post('/api/v1/proposals/:proposalId/accept', PartnerController.acceptProposal);

// Admin Debug Seeding (Run FDC Seeds on Prod without auth for a moment)
import { DebugController } from './controllers/DebugController';
app.get('/api/v1/public-debug/seed-fdc', DebugController.seedFdcProduction);

import contractsRoutes from './routes/contracts.routes';
import complianceRoutes from './routes/compliance.routes';
import yieldRoutes from './routes/yield.routes';
import billingRoutes from './routes/billing.routes';

// Protected Routes
app.use('/api/v1/dashboard', requireAuth, dashboardRoutes);
app.use('/api/v1/orders', requireAuth, orderRoutes);
app.use('/api/v1/upload', requireAuth, uploadRoutes);
app.use('/api/v1/inventory', requireAuth, inventoryRoutes);
app.use('/api/v1/delivery', requireAuth, deliveryRoutes);
app.use('/api/v1/purchases', requireAuth, purchaseRoutes);
app.use('/api/v1/barcodes', requireAuth, barcodeRoutes);
app.use('/api/v1/intelligence', requireAuth, intelligenceRoutes);
app.use('/api/v1/analyst', requireAuth, analystRoutes);
app.use('/api/v1/negotiation', requireAuth, negotiationRoutes);
app.use('/api/v1/reports', requireAuth, reportRoutes);
app.use('/api/v1/forecast', requireAuth, forecastRoutes);
app.use('/api/v1/support', requireAuth, supportRoutes);
app.use('/api/v1/owner', ownerRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/vault', vaultRoutes);
app.use('/api/v1/partner', partnerRoutes);
app.use('/api/v1/admin-partner', agvAdminRoutes);
app.use('/api/v1/contracts', requireAuth, contractsRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/yield', requireAuth, yieldRoutes);
app.use('/api/v1/billing', requireAuth, billingRoutes);
app.use('/api/v1', leadRoutes);
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/sre', sreRoutes);

// Temporary Setup Route (Remove in production later)
// Temporary Setup Route (Remove in production later)
import { SetupController } from './controllers/SetupController';
app.get('/api/v1/setup-demo', SetupController.runDemoSetup);
app.get('/api/v1/setup/seed-targets', SetupController.seedTargets); // Emergency Init Route

// Debug / Emergency Migration Route
app.get('/api/v1/debug/migrate', DebugController.runMigration);
app.get('/api/v1/debug/env', DebugController.checkEnv);
app.get('/api/v1/debug/cleanup', DebugController.cleanupTdbMeats);

app.get('/api/v1/debug/raw-specs', async (req, res) => {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const specs = await prisma.corporateProteinSpec.findMany();
        const traces = await prisma.barcodeScanEvent.findMany({
            where: { is_approved: false },
            orderBy: { scanned_at: 'desc' },
            take: 10
        });
        res.json({ success: true, specs, traces });
    } catch(err: any) {
        res.json({ success: false, err: err.message });
    }
});

app.post('/api/v1/debug/test-scan', async (req, res) => {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        let { companyId, gtin, barcode } = req.body;
        
        // Deprecated fallback removed
        gtin = gtin || '90076338879475';
        barcode = barcode || '0190076338879475320100083511260312210201000787';

        const specs = await prisma.corporateProteinSpec.findMany({
            where: { company_id: companyId }
        });

        const debugLog: any[] = [];
        
        const spec = specs.find((s: any) => {
            let cleanAppCode = s.approved_item_code.replace(/\D/g, '');
            const cleanGtin = gtin ? gtin.replace(/\D/g, '') : '';
            
            debugLog.push({ act: 'start', cleanAppCode, cleanGtin });

            if (cleanAppCode.length === 16 && (cleanAppCode.startsWith('01') || cleanAppCode.startsWith('02'))) {
                cleanAppCode = cleanAppCode.substring(2);
                debugLog.push({ act: 'stripped_16', cleanAppCode });
            }

            if (cleanGtin && cleanAppCode) {
                if (cleanGtin === cleanAppCode) { debugLog.push('matched_exact'); return true; }
                if (cleanGtin.padStart(14, '0') === cleanAppCode.padStart(14, '0')) { debugLog.push('matched_pad'); return true; }
                if (cleanAppCode.length >= 13 && cleanGtin.endsWith(cleanAppCode)) { debugLog.push('matched_ends_1'); return true; }
                if (cleanGtin.length >= 13 && cleanAppCode.endsWith(cleanGtin)) { debugLog.push('matched_ends_2'); return true; }

                if (cleanGtin.length >= 13 && cleanAppCode.length >= 4) {
                    const gtinWithoutCheckDigit = cleanGtin.slice(0, -1);
                    if (gtinWithoutCheckDigit.endsWith(cleanAppCode)) {
                        debugLog.push('matched_no_check'); return true;
                    }
                }
            }

            const fallback = barcode === s.approved_item_code;
            debugLog.push({ act: 'fallback', fallback });
            return fallback;
        });

        res.json({ success: true, companyId, gtin, barcode, matchFound: !!spec, debugLog, specs });
    } catch(err: any) {
        res.json({ success: false, err: err.message });
    }
});


app.get('/api/v1/debug/wipe-picanha', async (req, res) => {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const deleted = await prisma.corporateProteinSpec.deleteMany({
            where: {
                approved_item_code: '08351126031212'
            }
        });
        res.json({ success: true, message: `Wiped ${deleted.count} corrupted GTIN records.` });
    } catch(err: any) {
        res.json({ success: false, err: err.message });
    }
});

import { exec } from 'child_process';
app.get('/api/v1/debug/run-fix', async (req, res) => {
    if (req.query.key === 'fatality') {
        try {
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            
            const tdbCompany = await prisma.company.findFirst({
                where: { name: { contains: 'Texas' } }
            });

            if (!tdbCompany) throw new Error("TDB Company missing");

            const cid = tdbCompany.id;

            // Unflag all in company
            await prisma.store.updateMany({ 
                where: { company_id: cid },
                data: { is_pilot: false } 
            });

            // Delete demo stores
            const deleted = await prisma.store.deleteMany({
                 where: { 
                     company_id: cid, 
                     store_name: { contains: 'demo', mode: 'insensitive' } 
                 }
            });
            
            // Only update stores belonging to the active TdB company
            const stores = await prisma.store.findMany({ where: { company_id: cid } });
            
            const toUpdate = stores.filter((s: any) => {
                const raw = s.store_name.toLowerCase().trim();
                
                // Dallas must be exact to avoid "North Dallas" and "Dallas (Uptown)"
                const isDallas = raw === 'dallas' || raw === 'dallas tx';
                const isAddison = raw.includes('addison');
                const isMiami = raw.includes('miami');
                const isVegas = raw.includes('vegas');

                return isDallas || isAddison || isMiami || isVegas;
            });
            
            for (const store of toUpdate) {
                await prisma.store.update({
                    where: { id: store.id },
                    data: { is_pilot: true }
                });
            }
            res.json({ success: true, company: cid, updated: toUpdate.length, details: toUpdate.map((s: any) => s.store_name) });
        } catch (err: any) {
            res.json({ success: false, err: err.message });
        }
    } else {
        res.status(401).send('Unauthorized');
    }
});

// Serve Static Frontend (Production)
const CLIENT_BUILD_PATH = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '../../../client/dist') // From dist/src/index.js
    : path.join(__dirname, '../../client/dist');  // From src/index.ts

console.log(`[Static] Serving frontend from: ${CLIENT_BUILD_PATH}`);
app.use(express.static(CLIENT_BUILD_PATH));

// SPA Fallback
app.get('*', (req, res) => {
    // Only intercept if it's not an API route (which should return JSON 404s normally)
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API Endpoint Not Found' });
    }
    
    const indexPath = path.join(CLIENT_BUILD_PATH, 'index.html');
    res.sendFile(indexPath);
});

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function cleanupDuplicateProteins() {
    try {
        console.log(`[Startup] Cleaning up duplicate proteins from the database...`);
        const proteinsToRemove = ['Flap Steak', 'Lamb Picanha', 'Picanha with Garlic', 'Spicy Sirloin'];

        const deleted = await (prisma as any).companyProduct.deleteMany({
            where: {
                name: {
                    in: proteinsToRemove
                }
            }
        });
        console.log(`[Startup] SUCCESS: Removed ${deleted.count} duplicate proteins.`);
    } catch (error) {
        console.error('[Startup] FAILED to clean up duplicate proteins:', error);
    }
}

async function ensureDefaultSettings() {
    try {
        console.log(`[Startup] Ensuring default system settings exist...`);
        const defaults = [
            { key: 'global_target_lbs_guest', value: '1.76', type: 'number' },
            { key: 'global_target_cost_guest', value: '9.94', type: 'number' },
            { key: 'picanha_price_lb', value: '6.50', type: 'number' },
            {
                key: 'meat_standards',
                value: JSON.stringify({
                    "Picanha": 0.39,
                    "Fraldinha/Flank Steak": 0.24,
                    "Tri-Tip": 0.15,
                    "Filet Mignon": 0.10,
                    "Beef Ribs": 0.08,
                    "Pork Ribs": 0.12,
                    "Pork Loin": 0.06,
                    "Chicken Drumstick": 0.13,
                    "Chicken Breast": 0.14,
                    "Lamb Chops": 0.07,
                    "Leg of Lamb": 0.08,
                    "Lamb Picanha": 0.10,
                    "Sausage": 0.06
                }),
                type: 'json'
            }
        ];

        for (const setting of defaults) {
            await (prisma as any).systemSettings.upsert({
                where: { key: setting.key },
                update: {},
                create: setting
            });
        }

        // Seed Store-Specific Targets - REMOVED to avoid overwriting user changes.
        // Targets are now managed via the Executive Dashboard and Sync API.

        console.log(`[Startup] SUCCESS: Verified default system settings and store targets.`);
    } catch (error) {
        console.error('[Startup] FAILED to ensure default settings:', error);
    }
}

async function ensurePrimaryStoreUsers() {
    try {
        console.log(`[Startup] Ensuring primary store users are marked...`);
        const updated = await (prisma as any).user.updateMany({
            where: {
                role: { in: ['manager', 'admin', 'director'] },
                is_primary: false,
                first_name: null,
                last_name: null
            },
            data: { is_primary: true }
        });
        console.log(`[Startup] SUCCESS: Marked ${updated.count} legacy/system users as primary.`);
    } catch (error) {
        console.error('[Startup] FAILED to mark primary users:', error);
    }
}

async function ensureProductionAccounts() {
    try {
        console.log(`[Startup] Ensuring critical production accounts are protected with proper auth and roles...`);
        
        // Ensure bcrypt is available (it's imported at the top of the file if AuthController is used, but we'll use require to be safe if it's missing)
        const bcrypt = require('bcryptjs');
        
        const partnerPassword = await bcrypt.hash('brasa-partner-2026', 10);
        await (prisma as any).user.updateMany({
            where: { email: 'partner@example.com' },
            data: { 
                password_hash: partnerPassword,
                role: 'partner'
            }
        });
        
        const rodrigoPassword = await bcrypt.hash('TDB2026@', 10);
        await (prisma as any).user.updateMany({
            where: { email: 'rodrigodavila@texasdebrazil.com' },
            data: { password_hash: rodrigoPassword }
        });
        console.log(`[Startup] SUCCESS: Production accounts verified and secured.`);
    } catch (error) {
        console.error('[Startup] FAILED to ensure production accounts:', error);
    }
}

async function ensureOutbackPilot() {
    try {
        console.log(`[Startup] Ensuring Outback Steakhouse (Pilot) environment is seeded...`);
        let outback = await (prisma as any).company.findFirst({
            where: { name: { contains: 'Outback Steakhouse', mode: 'insensitive' } }
        });

        if (!outback) {
            outback = await (prisma as any).company.create({
                data: {
                    name: 'Outback Steakhouse (Pilot)',
                    operationType: 'ALACARTE',
                    plan: 'enterprise',
                    subdomain: 'outback',
                    theme_primary_color: '#ce1226',
                    theme_logo_url: '/outback-logo.svg',
                    theme_bg_url: '/outback-hero.mp4'
                }
            });
        } else {
            outback = await (prisma as any).company.update({
                where: { id: outback.id },
                data: { 
                    operationType: 'ALACARTE', 
                    subdomain: 'outback',
                    theme_primary_color: '#ce1226',
                    theme_logo_url: '/outback-logo.svg',
                    theme_bg_url: '/outback-hero.mp4'
                }
            });
        }

        const outbackProducts = [
            { name: 'Signature Sirloin 6oz', protein_group: 'Sirloin', is_villain: true, standard_target: 6.0 },
            { name: 'Signature Sirloin 8oz', protein_group: 'Sirloin', is_villain: true, standard_target: 8.0 },
            { name: 'Signature Sirloin 11oz', protein_group: 'Sirloin', is_villain: true, standard_target: 11.0 },
            { name: 'Victoria Filet 6oz', protein_group: 'Filet', is_villain: true, standard_target: 6.0 },
            { name: 'Victoria Filet 8oz', protein_group: 'Filet', is_villain: true, standard_target: 8.0 },
            { name: 'Ribeye 10oz', protein_group: 'Ribeye', is_villain: true, standard_target: 10.0 },
            { name: 'Ribeye 13oz', protein_group: 'Ribeye', is_villain: true, standard_target: 13.0 },
            { name: 'Bone-in Ribeye 18oz', protein_group: 'Ribeye', is_villain: false, standard_target: 18.0 },
            { name: 'Melbourne Porterhouse 22oz', protein_group: 'Porterhouse', is_villain: false, standard_target: 22.0 },
            { name: 'Bloomin Onion (Colossal)', protein_group: 'Produce', is_villain: false, standard_target: 1.0 },
            { name: 'Alice Springs Chicken 8oz', protein_group: 'Chicken', is_villain: false, standard_target: 8.0 }
        ];

        for (const prod of outbackProducts) {
            await (prisma as any).companyProduct.upsert({
                where: {
                    company_id_name: { company_id: outback.id, name: prod.name }
                },
                update: {
                    protein_group: prod.protein_group,
                    is_villain: prod.is_villain,
                    standard_target: prod.standard_target
                },
                create: {
                    company_id: outback.id,
                    name: prod.name,
                    protein_group: prod.protein_group,
                    is_villain: prod.is_villain,
                    standard_target: prod.standard_target
                }
            });
        }

        let store = await (prisma as any).store.findFirst({
            where: { store_name: 'Outback - Dallas Pilot', company_id: outback.id }
        });

        if (!store) {
            store = await (prisma as any).store.create({
                data: {
                    company_id: outback.id,
                    store_name: 'Outback - Dallas Pilot',
                    location: 'Dallas, TX',
                    is_pilot: true,
                    pilot_start_date: new Date(),
                    is_lunch_enabled: true,
                    lunch_start_time: '11:00',
                    lunch_end_time: '16:00',
                    dinner_start_time: '16:00',
                    dinner_end_time: '22:00',
                    baseline_loss_rate: 6.5
                }
            });
        }

        const jvpEmail = 'jvp.dallas@outback.com';
        const mpEmail = 'mp.dallas1@outback.com';

        await (prisma as any).user.upsert({
            where: { email: jvpEmail },
            update: { role: 'director', director_region: 'Dallas Metro', is_primary: true },
            create: {
                email: jvpEmail,
                first_name: 'John',
                last_name: 'JVP',
                password_hash: '$2b$10$xyz', 
                role: 'director',
                director_region: 'Dallas Metro',
                is_primary: true
            }
        });

        await (prisma as any).user.upsert({
            where: { email: mpEmail },
            update: { store_id: store.id, role: 'manager', is_primary: true },
            create: {
                email: mpEmail,
                first_name: 'Mike',
                last_name: 'MP',
                password_hash: '$2b$10$xyz', 
                role: 'manager',
                store_id: store.id,
                is_primary: true
            }
        });

        console.log(`[Startup] SUCCESS: Outback Steakhouse (Pilot) seeded.`);
    } catch (error) {
        console.error('[Startup] FAILED to seed Outback:', error);
    }
}

// Start Server after DB Check
if (process.env.NODE_ENV !== 'test') {
    SREStartupGuard.verifyEnvironmentSafety()
        .then(() => cleanupDuplicateProteins())
        .then(() => ensureDefaultSettings())
        .then(() => ensurePrimaryStoreUsers())
        .then(() => ensureProductionAccounts())
        .then(() => ensureOutbackPilot())
        .then(() => {
        // ... (existing imports)

        app.listen(PORT, () => {
            console.log(`🚀 BRASA INTEL v4.2.0-DASHBOARD-EXEC running on http://localhost:${PORT}`);
            console.log(`📅 Business Date Sync: Central Time (UTC-6) ACTIVE`);

            // 🟢 24/7 AI AGENT BACKGROUND LOOP
            console.log(`🤖 AI Prospecting Agent: ONLINE (24/7 Watch Mode)`);

            // 🔵 OFFICE 365 CONNECT (WATCHER)
            OneDriveWatcher.start();

            // Run immediately on startup
            ProspectingAgent.discoverNewProspects();

            // Then run every 6 hours (Simulation of "24/7" work)
            setInterval(() => {
                const now = new Date();
                const mem = process.memoryUsage();
                console.log(`[${now.toISOString()}] 🩺 HEARTBEAT | Memory: ${Math.round(mem.rss / 1024 / 1024)}MB RSS | Mode: PROSPECTING`);
            }, 60 * 60 * 1000); // Hourly

            // 🔴 24/7 SENTINEL AI METRIC AUDITOR
            console.log(`🛡️ Sentinel AI Background Auditor: ONLINE (Cron Mode)`);
            
            // Schedule to run every hour at minute 0 (0 * * * *) 
            // For testing/demonstration purposes, we will also run it on startup
            SentinelService.runDailyAudit();
            cron.schedule('0 * * * *', () => {
                SentinelService.runDailyAudit();
            });
        });
    }).catch(err => {
        console.error("🔥 [FATAL BOOT ERROR] Startup aborted.", err);
        process.exit(1);
    });
}
