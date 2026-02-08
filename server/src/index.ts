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
app.use(cors());
app.use(helmet());
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

import path from 'path';

// Auth Routes (Public)
app.use('/api/v1/auth', authRoutes);

// Protected Routes
app.use('/api/v1/dashboard', requireAuth, dashboardRoutes);
app.use('/api/v1/orders', requireAuth, orderRoutes);
app.use('/api/v1/upload', requireAuth, uploadRoutes);
app.use('/api/v1/inventory', requireAuth, inventoryRoutes);
app.use('/api/v1/automation', requireAuth, automationRoutes);

// Serve Static Frontend (Production)
// In Docker, we'll copy client/dist to server/public or similar
const CLIENT_BUILD_PATH = path.join(__dirname, '../../client/dist');
app.use(express.static(CLIENT_BUILD_PATH));

// SPA Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(CLIENT_BUILD_PATH, 'index.html'));
});

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function ensureDirectorUser() {
    try {
        const email = 'dallas@texasdebrazil.com';
        const password = 'Dallas2026';
        // @ts-ignore: Role 'director' added to schema, allowing string override until regen
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

// Start Server after DB Check
ensureDirectorUser().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
});
