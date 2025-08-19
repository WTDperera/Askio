import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import 'dotenv/config';
import connectDB from './configs/db.js';
import postsRouter from './routes/posts.js';
import storiesRouter from './routes/stories.js';
import usersRouter from './routes/users.js';
import messagesRouter from './routes/messages.js';
import notificationsRouter from './routes/notifications.js';
import debugRouter from './routes/debug.js';
import inngestRouter from './routes/inngest.js';
import { startStoryCleanup } from './services/storyCleanup.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve allowed origins (comma‑separated env) – default to Vite dev origins when not in production.
const devMode = process.env.NODE_ENV !== 'production';
const defaultDevOrigins = ['http://localhost:5173','http://127.0.0.1:5173'];
const allowedOrigins = (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : (devMode ? defaultDevOrigins : []))
  .map(o => o.trim())
  .filter(Boolean);

// Build CSP directives allowing explicit frontend origins plus data URIs for inline assets.
const baseImgSrc = ["'self'","data:"];
const baseMediaSrc = ["'self'","data:"];
const imgSrc = [...baseImgSrc, ...allowedOrigins];
const mediaSrc = [...baseMediaSrc, ...allowedOrigins];

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src': imgSrc,
      'media-src': mediaSrc,
    }
  }
}));

// CORS: strict allow‑list in production, permissive (any) when dev and no list provided.
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // non-browser or same-origin
    if (allowedOrigins.length === 0 && devMode) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
// Static media – served with liberal cross origin headers (frontend may be on another port).
app.use('/uploads', (req, res, next) => {
  if (process.env.LOG_UPLOAD_REQUESTS === 'true') console.log('[uploads]', req.method, req.url);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || (allowedOrigins.length === 0 && devMode))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  next();
}, express.static(uploadsPath));
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

app.get('/', (_req, res) => {
  res.send('server is running');
});

app.use('/api/posts', postsRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/users', usersRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/notifications', notificationsRouter);
app.use(inngestRouter);
app.use('/api/debug', debugRouter);

// Central error fallthrough (keep last)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 4000;

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  startStoryCleanup();
  } catch (err) {
    console.error('Failed to start server:', err.message || err);
    process.exit(1);
  }
};

start();

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
