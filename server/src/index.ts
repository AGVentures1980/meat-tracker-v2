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

// Mock Authentication Middleware (for Prototype V2)
// In production this would verify JWTs
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'Missing Authorization header' });
    next();
};

// API Routes
import dashboardRoutes from './routes/dashboard.routes';
import orderRoutes from './routes/order.routes';
import uploadRoutes from './routes/upload.routes';

import path from 'path';

app.use('/api/v1/dashboard', requireAuth, dashboardRoutes);
app.use('/api/v1/orders', requireAuth, orderRoutes);
app.use('/api/v1/upload', requireAuth, uploadRoutes);

// Serve Static Frontend (Production)
// In Docker, we'll copy client/dist to server/public or similar
const CLIENT_BUILD_PATH = path.join(__dirname, '../../client/dist');
app.use(express.static(CLIENT_BUILD_PATH));

// SPA Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(CLIENT_BUILD_PATH, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
