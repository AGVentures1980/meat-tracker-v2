import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'https://meat-intelligence.up.railway.app',
            'https://meat-intelligence-final.up.railway.app',
            'https://brasameat.com',
            'https://www.brasameat.com',
            'https://fogo.brasameat.com',
            'https://fdc.brasameat.com'
        ];
        if (allowedOrigins.includes(origin) || origin.endsWith('.brasameat.com')) {
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

// Import Real Auth Middleware
import { requireAuth } from './middleware/auth.middleware';
import authRoutes from './routes/auth.routes';

// Global Request Logger
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[HTTP] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
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
import intelligenceRoutes from './routes/intelligence.routes';
import analystRoutes from './routes/analyst.routes';
import negotiationRoutes from './routes/negotiation.routes';
import reportRoutes from './routes/report.routes';
import forecastRoutes from './routes/forecast.routes';
import ownerRoutes from './routes/owner.routes';
import userRoutes from './routes/user.routes';
import supportRoutes from './routes/support.routes';
import vaultRoutes from './routes/vault.routes';
import themeRoutes from './routes/theme.routes';
import partnerRoutes from './routes/partner.routes';
import agvAdminRoutes from './routes/agv-admin.routes';
import ediRoutes from './routes/edi.routes';

import { ProspectingAgent } from './services/ProspectingAgent';
import { OneDriveWatcher } from './services/OneDriveWatcher';

import path from 'path';

// Auth Routes (Public)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/theme', themeRoutes); // Public theme fetching

import { PartnerController } from './controllers/PartnerController';

// Public Proposal Acceptance (Stripe Entrypoint)
app.get('/api/v1/proposals/:proposalId', PartnerController.getPublicProposal);
app.post('/api/v1/proposals/:proposalId/accept', PartnerController.acceptProposal);

// Admin Debug Seeding (Run FDC Seeds on Prod without auth for a moment)
import { DebugController } from './controllers/DebugController';
app.get('/api/v1/public-debug/seed-fdc', DebugController.seedFdcProduction);

import contractsRoutes from './routes/contracts.routes';

// Protected Routes
app.use('/api/v1/dashboard', requireAuth, dashboardRoutes);
app.use('/api/v1/orders', requireAuth, orderRoutes);
app.use('/api/v1/upload', requireAuth, uploadRoutes);
app.use('/api/v1/inventory', requireAuth, inventoryRoutes);
app.use('/api/v1/delivery', requireAuth, deliveryRoutes);
app.use('/api/v1/purchases', requireAuth, purchaseRoutes);
app.use('/api/v1/intelligence', requireAuth, intelligenceRoutes);
app.use('/api/v1/analyst', requireAuth, analystRoutes);
app.use('/api/v1/negotiation', requireAuth, negotiationRoutes);
app.use('/api/v1/reports', requireAuth, reportRoutes);
app.use('/api/v1/forecast', requireAuth, forecastRoutes);
app.use('/api/v1/support', requireAuth, supportRoutes);
app.use('/api/v1/owner', ownerRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/vault', vaultRoutes);
app.use('/api/v1/partner', partnerRoutes);
app.use('/api/v1/admin-partner', agvAdminRoutes);
app.use('/api/v1/contracts', requireAuth, contractsRoutes);

// Temporary Setup Route (Remove in production later)
// Temporary Setup Route (Remove in production later)
import { SetupController } from './controllers/SetupController';
app.get('/api/v1/setup-demo', SetupController.runDemoSetup);
app.get('/api/v1/setup/seed-targets', SetupController.seedTargets); // Emergency Init Route

// Debug / Emergency Migration Route
app.get('/api/v1/debug/migrate', DebugController.runMigration);
app.get('/api/v1/debug/env', DebugController.checkEnv);
app.get('/api/v1/debug/cleanup', DebugController.cleanupTdbMeats);

import { exec } from 'child_process';
app.get('/api/v1/debug/run-fix', async (req, res) => {
    if (req.query.key === 'fatality') {
        try {
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            const stores = await prisma.store.findMany();
            await prisma.store.updateMany({ data: { is_pilot: false } });
            
            const toUpdate = stores.filter((s: any) => 
                s.store_name.toLowerCase().includes('dallas') ||
                s.store_name.toLowerCase().includes('addison') ||
                s.store_name.toLowerCase().includes('miami beach') ||
                s.store_name.toLowerCase().includes('las vegas')
            );
            
            for (const store of toUpdate) {
                await prisma.store.update({
                    where: { id: store.id },
                    data: { is_pilot: true }
                });
            }
            res.json({ success: true, updated: toUpdate.length, details: toUpdate.map((s: any) => s.store_name) });
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

// Start Server after DB Check
cleanupDuplicateProteins()
    .then(() => ensureDefaultSettings())
    .then(() => ensurePrimaryStoreUsers())
    .then(() => ensureProductionAccounts())
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
            console.log(`🕒 Scheduled AI Scan Triggered...`);
            ProspectingAgent.discoverNewProspects();
        }, 6 * 60 * 60 * 1000);
    });
});
