import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Post from '../models/Post.js';
import { requireAuth, authOptional } from '../middleware/auth.js';
import { syncUser } from '../services/userSync.js';
import { createNotification } from '../services/notify.js';

const router = express.Router();

// Setup multer storage for cover/profile uploads (images only)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype ? ('.' + file.mimetype.split('/')[1]) : '');
    cb(null, 'cover-' + Date.now() + '-' + Math.round(Math.random()*1e9) + ext);
  }
});
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image uploads allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// GET /api/users/me – ensure & return current Clerk user (syncs core fields)
router.get('/me', requireAuth, async (req, res) => {
  const user = await syncUser(req.auth.userId);
  res.json(user);
});

// GET /api/users?q=term – search users (public, auth optional for follow state)
router.get('/', authOptional, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const meId = req.auth?.userId;
    const criteria = q
      ? {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { full_name: { $regex: q, $options: 'i' } }
          ]
        }
      : {};
    const users = await User.find(criteria)
      .sort(q ? { username: 1 } : { createdAt: -1 })
      .limit(30)
      .lean();
    const items = users.map(u => ({
      clerkId: u.clerkId,
      full_name: u.full_name,
      username: u.username,
      profile_picture: u.profile_picture,
      bio: u.bio,
      followers: u.followers?.length || 0,
      following: u.following?.length || 0,
      isFollowing: meId ? (u.followers || []).includes(meId) : false,
      isSelf: meId === u.clerkId
    }));
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// POST /api/users/:clerkId/follow – follow user
router.post('/:clerkId/follow', requireAuth, async (req, res) => {
  const targetId = req.params.clerkId;
  const meId = req.auth.userId;
  if (targetId === meId) return res.status(400).json({ error: 'Cannot follow yourself' });
  try {
    // ensure both docs exist
    await syncUser(meId);
    const target = await User.findOne({ clerkId: targetId });
    if (!target) return res.status(404).json({ error: 'User not found' });
    const me = await User.findOneAndUpdate(
      { clerkId: meId },
      { $addToSet: { following: targetId } },
      { new: true }
    );
    await User.updateOne(
      { clerkId: targetId },
      { $addToSet: { followers: meId } }
    );
    res.json({
      success: true,
      me: { clerkId: me.clerkId, following: me.following },
      target: { clerkId: target.clerkId }
    });
  // notify target user
  createNotification({ userId: targetId, actorId: meId, type: 'follow', entityType: 'user', entityId: meId });
  } catch (e) {
    res.status(500).json({ error: 'Follow failed' });
  }
});

// DELETE /api/users/:clerkId/follow – unfollow user
router.delete('/:clerkId/follow', requireAuth, async (req, res) => {
  const targetId = req.params.clerkId;
  const meId = req.auth.userId;
  if (targetId === meId) return res.status(400).json({ error: 'Cannot unfollow yourself' });
  try {
    const me = await User.findOneAndUpdate(
      { clerkId: meId },
      { $pull: { following: targetId } },
      { new: true }
    );
    await User.updateOne(
      { clerkId: targetId },
      { $pull: { followers: meId } }
    );
    res.json({
      success: true,
      me: { clerkId: me?.clerkId, following: me?.following },
      target: { clerkId: targetId }
    });
  } catch (e) {
    res.status(500).json({ error: 'Unfollow failed' });
  }
});

// GET /api/users/:clerkId/followers – list followers (public, auth optional for isFollowing flags)
router.get('/:clerkId/followers', authOptional, async (req, res) => {
  try {
    const target = await User.findOne({ clerkId: req.params.clerkId }).lean();
    if (!target) return res.status(404).json({ error: 'Not found' });
    const ids = (target.followers || []).slice(0, 100);
    const users = await User.find({ clerkId: { $in: ids } }).lean();
    const meId = req.auth?.userId;
    const items = users.map(u => ({
      clerkId: u.clerkId,
      full_name: u.full_name,
      username: u.username,
      profile_picture: u.profile_picture,
      isFollowing: meId ? (u.followers || []).includes(meId) : false,
      isSelf: meId === u.clerkId
    }));
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load followers' });
  }
});

// GET /api/users/:clerkId/following – list following
router.get('/:clerkId/following', authOptional, async (req, res) => {
  try {
    const target = await User.findOne({ clerkId: req.params.clerkId }).lean();
    if (!target) return res.status(404).json({ error: 'Not found' });
    const ids = (target.following || []).slice(0, 100);
    const users = await User.find({ clerkId: { $in: ids } }).lean();
    const meId = req.auth?.userId;
    const items = users.map(u => ({
      clerkId: u.clerkId,
      full_name: u.full_name,
      username: u.username,
      profile_picture: u.profile_picture,
      isFollowing: meId ? (u.followers || []).includes(meId) : false,
      isSelf: meId === u.clerkId
    }));
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load following' });
  }
});

// GET /api/users/:clerkId – public profile
router.get('/:clerkId', authOptional, async (req, res) => {
  const user = await User.findOne({ clerkId: req.params.clerkId }).lean();
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

// PATCH /api/users/me – update editable profile fields
router.patch('/me', requireAuth, async (req, res) => {
  const allowed = ['full_name','username','bio','website','location','profile_picture','cover_picture'];
  const updates = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  const user = await User.findOneAndUpdate({ clerkId: req.auth.userId }, { $set: updates }, { new: true, upsert: true });
  res.json(user);
});

// POST /api/users/me/cover – upload & set cover_picture
router.post('/me/cover', requireAuth, upload.single('cover'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File required' });
    const relPath = '/uploads/' + req.file.filename;
    const user = await User.findOneAndUpdate({ clerkId: req.auth.userId }, { $set: { cover_picture: relPath } }, { new: true });
    res.json({ cover_picture: relPath, user });
  } catch (e) {
    console.error('Cover upload failed', e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// GET /api/users/:clerkId/posts – list that user's posts
router.get('/:clerkId/posts', authOptional, async (req, res) => {
  const posts = await Post.find({ userId: req.params.clerkId }).sort({ createdAt:-1 }).lean();
  res.json(posts);
});

export default router;
