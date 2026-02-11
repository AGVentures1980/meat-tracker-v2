import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://meat-intelligence.up.railway.app',
        'https://meat-intelligence-final.up.railway.app'
    ],
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

// API Routes
import dashboardRoutes from './routes/dashboard.routes';
import orderRoutes from './routes/order.routes';
import uploadRoutes from './routes/upload.routes';
import inventoryRoutes from './routes/inventory.routes';
import automationRoutes from './routes/automation.routes';
import deliveryRoutes from './routes/delivery.routes';
import purchaseRoutes from './routes/purchase.routes';

import path from 'path';

// Auth Routes (Public)
app.use('/api/v1/auth', authRoutes);

// Protected Routes
app.use('/api/v1/dashboard', requireAuth, dashboardRoutes);
app.use('/api/v1/orders', requireAuth, orderRoutes);
app.use('/api/v1/upload', requireAuth, uploadRoutes);
app.use('/api/v1/inventory', requireAuth, inventoryRoutes);
app.use('/api/v1/delivery', requireAuth, deliveryRoutes);
app.use('/api/v1/purchases', requireAuth, purchaseRoutes);

// Temporary Setup Route (Remove in production later)
// Temporary Setup Route (Remove in production later)
import { SetupController } from './controllers/SetupController';
app.get('/api/v1/setup-demo', SetupController.runDemoSetup);

// Debug / Emergency Migration Route
import { DebugController } from './controllers/DebugController';
app.get('/api/v1/debug/migrate', DebugController.runMigration);
app.get('/api/v1/debug/env', DebugController.checkEnv);

// Serve Static Frontend (Production)
const CLIENT_BUILD_PATH = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '../../../client/dist') // From dist/src/index.js
    : path.join(__dirname, '../../client/dist');  // From src/index.ts

app.use(express.static(CLIENT_BUILD_PATH));

// SPA Fallback
app.get('*', (req, res) => {
    const indexPath = path.join(CLIENT_BUILD_PATH, 'index.html');
    res.sendFile(indexPath);
});

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function ensureDirectorUser() {
    try {
        const email = 'dallas@texasdebrazil.com';
        const password = 'Dallas2026';
        const role = 'director' as any;
        const name = 'Director Dallas';

        console.log(`[Startup] Ensuring user ${email} exists...`);
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.upsert({
            where: { email },
            update: {
                password_hash: hashedPassword,
                role: role
            },
            create: {
                email,
                password_hash: hashedPassword,
                role: role
            },
        });
        console.log(`[Startup] SUCCESS: Verified user ${user.email} with role ${user.role}`);
    } catch (error) {
        console.error('[Startup] FAILED to ensure director user:', error);
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

// Start Server after DB Check
ensureDirectorUser().then(() => ensureDefaultSettings()).then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 BRASA INTEL v2.5.27-GOLD running on http://localhost:${PORT}`);
        console.log(`📅 Business Date Sync: Central Time (UTC-6) ACTIVE`);
    });
});
