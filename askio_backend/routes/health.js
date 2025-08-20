import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV || 'development',
    uptimeSec: Math.round(process.uptime()),
    mongo: (() => {
      switch (mongoose.connection.readyState) {
        case 0: return 'disconnected';
        case 1: return 'connected';
        case 2: return 'connecting';
        case 3: return 'disconnecting';
        default: return 'unknown';
      }
    })(),
    timestamp: new Date().toISOString()
  });
});

export default router;
