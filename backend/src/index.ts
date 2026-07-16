import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './utils/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authenticate } from './middleware/authenticate.js';
import authRoutes from './routes/authRoutes.js';
import prospectRoutes from './routes/prospectRoutes.js';
import templateRoutes, { whatsappRouter } from './routes/templateRoutes.js';
import importRoutes, { exportRouter } from './routes/importExportRoutes.js';

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'GroovCRM' });
});

app.use('/api/auth', authRoutes);
app.use('/api/prospects', authenticate, prospectRoutes);
app.use('/api/templates', authenticate, templateRoutes);
app.use('/api/whatsapp', authenticate, whatsappRouter);
app.use('/api/import', authenticate, importRoutes);
app.use('/api/export', authenticate, exportRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`GroovCRM API listening on port ${env.PORT} (express5-safe-validation)`);
});
