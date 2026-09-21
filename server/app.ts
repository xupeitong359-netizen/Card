import express, { Express } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { router as apiRouter } from './routes.js';

export function createApp(): Express {
  const app = express();
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Parse JSON bodies
  app.use(express.json({ limit: '5mb' }));

  // Static uploads directory with caching
  app.use('/uploads', express.static(uploadsDir, {
    maxAge: '30d',
    immutable: true,
  }));

  // Mount API routes
  app.use('/api', apiRouter);

  return app;
}
