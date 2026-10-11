import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { seedInitialDataIfNeeded } from './server/seedData.js';
import { authRouter } from './server/routes/authRoutes.js';
import { academicRouter } from './server/routes/academicRoutes.js';
import { taskRouter } from './server/routes/taskRoutes.js';
import { examRouter } from './server/routes/examRoutes.js';
import { plannerRouter } from './server/routes/plannerRoutes.js';
import { focusRouter } from './server/routes/focusRoutes.js';
import { habitRouter } from './server/routes/habitRoutes.js';
import { noteRouter } from './server/routes/noteRoutes.js';
import { dashboardRouter } from './server/routes/dashboardRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Seed sample data if database is empty
seedInitialDataIfNeeded();

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    version: '1.0.0',
    app: 'StudyOS',
    timestamp: new Date().toISOString(),
  });
});

// Mount REST API routers under /api/v1
const API_PREFIX = '/api/v1';
app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}`, academicRouter);
app.use(`${API_PREFIX}`, taskRouter);
app.use(`${API_PREFIX}`, examRouter);
app.use(`${API_PREFIX}`, plannerRouter);
app.use(`${API_PREFIX}`, focusRouter);
app.use(`${API_PREFIX}`, habitRouter);
app.use(`${API_PREFIX}`, noteRouter);
app.use(`${API_PREFIX}`, dashboardRouter);

// Global API error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  return res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
});

// Frontend serving
async function startServer() {
  if (!isProduction) {
    // Development mode: mount Vite dev middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production mode: serve built assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StudyOS Server running on http://0.0.0.0:${PORT} in ${isProduction ? 'production' : 'development'} mode`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
