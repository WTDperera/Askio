import express from 'express';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// List notifications (latest first) with pagination
router.get('/', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
  const skip = (page - 1) * limit;
  try {
    const [items, total] = await Promise.all([
      Notification.find({ userId: req.auth.userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments({ userId: req.auth.userId })
    ]);
    const actorIds = [...new Set(items.map(n => n.actorId))];
    const actors = await User.find({ clerkId: { $in: actorIds } }).lean();
    const actorMap = Object.fromEntries(actors.map(a => [a.clerkId, a]));
    res.json({ page, total, items: items.map(n => ({
      id: n._id,
      type: n.type,
      entityType: n.entityType,
      entityId: n.entityId,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt,
      actor: actorMap[n.actorId] ? {
        clerkId: actorMap[n.actorId].clerkId,
        full_name: actorMap[n.actorId].full_name,
        username: actorMap[n.actorId].username,
        profile_picture: actorMap[n.actorId].profile_picture
      } : { clerkId: n.actorId }
    })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

// Mark all as read
router.post('/read-all', requireAuth, async (req, res) => {
  await Notification.updateMany({ userId: req.auth.userId, read: false }, { $set: { read: true } });
  res.json({ success: true });
});

// Mark one as read
router.post('/:id/read', requireAuth, async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, userId: req.auth.userId }, { $set: { read: true } });
  res.json({ success: true });
});

export default router;
