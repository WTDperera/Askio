import express from 'express';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { createNotification } from '../services/notify.js';

const router = express.Router();

// List recent conversations for current user with last message + peer basic profile
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const me = req.auth.userId;
    // aggregate last message per peer
    const pipeline = [
      { $match: { $or: [{ from: me }, { to: me }] } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$conversation', last: { $first: '$$ROOT' } } },
      { $limit: 30 },
      { $replaceRoot: { newRoot: '$last' } }
    ];
    const messages = await Message.aggregate(pipeline);
    const peerIds = [...new Set(messages.map(m => m.from === me ? m.to : m.from))];
    const peers = await User.find({ clerkId: { $in: peerIds } }).lean();
    const peerMap = Object.fromEntries(peers.map(p => [p.clerkId, p]));
    const items = messages.map(m => {
      const peerId = m.from === me ? m.to : m.from;
      const p = peerMap[peerId] || { clerkId: peerId };
      return {
        id: m._id,
        text: m.text,
        seen: m.seen,
        createdAt: m.createdAt,
        peer: {
          clerkId: peerId,
          full_name: p.full_name,
          username: p.username,
          profile_picture: p.profile_picture
        }
      };
    });
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load conversations' });
  }
});

// Fetch messages in a conversation with specific user
router.get('/with/:peerId', requireAuth, async (req, res) => {
  try {
    const me = req.auth.userId;
    const peerId = req.params.peerId;
    const a = me < peerId ? me : peerId;
    const b = me < peerId ? peerId : me;
    const convo = `${a}:${b}`;
    const messages = await Message.find({ conversation: convo }).sort({ createdAt: 1 }).lean();
    res.json({ items: messages });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// Send a message
router.post('/with/:peerId', requireAuth, async (req, res) => {
  try {
    const me = req.auth.userId;
    const peerId = req.params.peerId;
    const { text, message_type, media_url } = req.body;
    if (!text && !media_url) return res.status(400).json({ error: 'Content required' });
  const msg = await Message.create({ from: me, to: peerId, text, message_type: message_type || (media_url ? 'media' : 'text'), media_url });
  // notify recipient
  createNotification({ userId: peerId, actorId: me, type: 'message', entityType: 'message', entityId: msg._id, message: text ? undefined : 'Sent you a media message' });
    res.status(201).json(msg);
  } catch (e) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark conversation as seen
router.post('/with/:peerId/seen', requireAuth, async (req, res) => {
  try {
    const me = req.auth.userId;
    const peerId = req.params.peerId;
    const a = me < peerId ? me : peerId;
    const b = me < peerId ? peerId : me;
    const convo = `${a}:${b}`;
    await Message.updateMany({ conversation: convo, to: me, seen: false }, { $set: { seen: true } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to mark seen' });
  }
});

export default router;
