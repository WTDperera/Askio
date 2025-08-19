import express from 'express';
import Story from '../models/Story.js';
import { requireAuth, authOptional } from '../middleware/auth.js';
import { syncUser, ensureUsersLoaded } from '../services/userSync.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype ? '.' + (file.mimetype.split('/')[1] === 'jpeg' ? 'jpg' : file.mimetype.split('/')[1]) : '');
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype) || /^video\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type'));
  },
  limits: { fileSize: 20 * 1024 * 1024 }
});

const router = express.Router();

// GET /api/stories – list non‑expired stories (24h TTL).
router.get('/', authOptional, async (_req, res) => {
  const now = new Date();
  const stories = await Story.find({ expiresAt: { $gt: now } }).sort({ createdAt: -1 }).lean();
  const userIds = stories.map(s => s.userId);
  const userMap = await ensureUsersLoaded(userIds);
  const enriched = stories.map(s => ({
    ...s,
    user: userMap[s.userId] ? {
      full_name: userMap[s.userId].full_name || s.userId,
      username: userMap[s.userId].username || s.userId,
      profile_picture: userMap[s.userId].profile_picture || '/default-avatar.png'
    } : { full_name: s.userId, username: s.userId, profile_picture: '/default-avatar.png' }
  }));
  res.json(enriched);
});

// POST /api/stories – create text/image/video story (single media).
router.post('/', requireAuth, upload.single('media'), async (req, res) => {
  let { media_type, media_url, content, background_color } = req.body;
  if (req.file) {
    if (process.env.LOG_UPLOAD_REQUESTS === 'true') {
      console.log('[story-upload]', req.file.originalname, req.file.mimetype, '->', req.file.filename);
    }
    if (!media_type) {
      media_type = req.file.mimetype.startsWith('image/') ? 'image' : (req.file.mimetype.startsWith('video/') ? 'video' : undefined);
    }
    media_url = `/uploads/${req.file.filename}`;
  }
  if (!media_type) return res.status(400).json({ error: 'media_type required' });
  if (media_type === 'text' && !content) return res.status(400).json({ error: 'content required for text story' });
  if (media_type !== 'text' && !media_url) return res.status(400).json({ error: 'media_url required for media story' });
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const synced = await syncUser(req.auth.userId);
  const doc = await Story.create({ userId: req.auth.userId, media_type, media_url, content, background_color, expiresAt });
  if (process.env.LOG_UPLOAD_REQUESTS === 'true') {
    console.log('[story-create] stored', { media_type, media_url });
  }
  res.status(201).json({
    ...doc.toObject(),
    user: {
      full_name: synced?.full_name || req.auth.userId,
      username: synced?.username || req.auth.userId,
      profile_picture: synced?.profile_picture || '/default-avatar.png'
    }
  });
});

// DELETE /api/stories/:id – remove own story.
router.delete('/:id', requireAuth, async (req, res) => {
  const story = await Story.findById(req.params.id);
  if (!story) return res.status(404).json({ error: 'Not found' });
  if (story.userId !== req.auth.userId) return res.status(403).json({ error: 'Forbidden' });
  await story.deleteOne();
  res.status(204).end();
});

// PATCH /api/stories/:id – edit text/background (media immutable for now).
router.patch('/:id', requireAuth, async (req, res) => {
  const story = await Story.findById(req.params.id);
  if (!story) return res.status(404).json({ error: 'Not found' });
  if (story.userId !== req.auth.userId) return res.status(403).json({ error: 'Forbidden' });
  const { content, background_color } = req.body;
  if (content !== undefined) story.content = content;
  if (background_color !== undefined) story.background_color = background_color;
  await story.save();
  res.json(story);
});

export default router;
