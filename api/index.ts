import express from 'express';
import apiRouter from '../server/routes.js';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoints
app.get(['/api/health', '/health'], (_req, res) => {
  res.json({ status: 'ok', name: 'ClientVault API', version: '1.0.0' });
});

// Mount routes for both /api and root fallback on Vercel
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
