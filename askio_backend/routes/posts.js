import express from 'express';
import Post from '../models/Post.js';
import { requireAuth, authOptional } from '../middleware/auth.js';
import { syncUser, ensureUsersLoaded } from '../services/userSync.js';
import { createNotification } from '../services/notify.js';
import { inngest } from '../inngest.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Multer storage: keep original (or inferred) extension for proper browser rendering.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (_req, file, cb) => {
    const origExt = path.extname(file.originalname);
    const mimeExt = (() => {
      if (origExt) return origExt; // already has extension
      if (!file.mimetype) return '';
      const subtype = file.mimetype.split('/')[1];
      if (!subtype) return '';
      // simple normalization
      if (subtype === 'jpeg') return '.jpg';
      return '.' + subtype;
    })();
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + mimeExt);
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

// GET /api/posts – feed listing with simple pagination & user enrichment.
router.get('/', authOptional, async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Post.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Post.countDocuments()
  ]);
  // Collect userIds for post authors + commenters for enrichment
  const userIdSet = new Set(items.map(p => p.userId));
  for (const p of items) {
    if (Array.isArray(p.comments)) {
      for (const c of p.comments) userIdSet.add(c.userId);
    }
  }
  const userMap = await ensureUsersLoaded([...userIdSet]);
  const enriched = items.map(p => ({
    ...p,
    id: p._id, // frontend convenience alias
    user: userMap[p.userId] ? {
      full_name: userMap[p.userId].full_name || p.userId,
      username: userMap[p.userId].username || p.userId,
      profile_picture: userMap[p.userId].profile_picture || '/default-avatar.png'
    } : { full_name: p.userId, username: p.userId, profile_picture: '/default-avatar.png' },
    comments: (p.comments || []).map(c => ({
      ...c,
      id: c._id,
      user: userMap[c.userId] ? {
        full_name: userMap[c.userId].full_name || c.userId,
        username: userMap[c.userId].username || c.userId,
        profile_picture: userMap[c.userId].profile_picture || '/default-avatar.png'
      } : { full_name: c.userId, username: c.userId, profile_picture: '/default-avatar.png' }
    }))
  }));
  res.json({ page, total, items: enriched });
});

// POST /api/posts – create single‑media (or text) post.
router.post('/', requireAuth, upload.single('media'), async (req, res) => {
  const { content } = req.body;
  let image_urls = [];
  let video_url;
  if (req.file) {
    if (process.env.LOG_UPLOAD_REQUESTS === 'true') {
      console.log('[post-upload]', req.file.originalname, req.file.mimetype, '->', req.file.filename);
    }
    const isImage = req.file.mimetype.startsWith('image/');
    if (isImage) image_urls = [`/uploads/${req.file.filename}`];
    else if (req.file.mimetype.startsWith('video/')) video_url = `/uploads/${req.file.filename}`;
  } else {
    // accept JSON body arrays for API clients
    try { if (req.body.image_urls) image_urls = JSON.parse(req.body.image_urls); } catch {}
    if (req.body.video_url) video_url = req.body.video_url;
  }
  await syncUser(req.auth.userId);
  const doc = await Post.create({ userId: req.auth.userId, content, image_urls, video_url, likes: [], comments: [] });
  if (process.env.LOG_UPLOAD_REQUESTS === 'true') {
    console.log('[post-create] stored', { image_urls, video_url });
  }
  // Fire background event
  try {
    await inngest.send({ name: 'post/created', data: { post: doc.toObject() } });
  } catch (e) {
    if (process.env.LOG_UPLOAD_REQUESTS === 'true') console.warn('[inngest] send failed', e.message);
  }
  const obj = doc.toObject();
  obj.id = obj._id;
  res.status(201).json(obj);
});

// GET /api/posts/:id – fetch one post.
router.get('/:id', authOptional, async (req, res) => {
  const post = await Post.findById(req.params.id).lean();
  if (!post) return res.status(404).json({ error: 'Not found' });
  // Enrich user + commenters
  const ids = new Set([post.userId, ...(post.comments || []).map(c => c.userId)]);
  const userMap = await ensureUsersLoaded([...ids]);
  const enriched = {
    ...post,
    id: post._id,
    user: userMap[post.userId] ? {
      full_name: userMap[post.userId].full_name || post.userId,
      username: userMap[post.userId].username || post.userId,
      profile_picture: userMap[post.userId].profile_picture || '/default-avatar.png'
    } : { full_name: post.userId, username: post.userId, profile_picture: '/default-avatar.png' },
    comments: (post.comments || []).map(c => ({
      ...c,
      id: c._id,
      user: userMap[c.userId] ? {
        full_name: userMap[c.userId].full_name || c.userId,
        username: userMap[c.userId].username || c.userId,
        profile_picture: userMap[c.userId].profile_picture || '/default-avatar.png'
      } : { full_name: c.userId, username: c.userId, profile_picture: '/default-avatar.png' }
    }))
  };
  res.json(enriched);
});

// PATCH /api/posts/:id – owner can mutate content/media references.
router.patch('/:id', requireAuth, async (req, res) => {
  const { content, image_urls, video_url } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  if (post.userId !== req.auth.userId) return res.status(403).json({ error: 'Forbidden' });
  if (content !== undefined) post.content = content;
  if (image_urls !== undefined) post.image_urls = image_urls;
  if (video_url !== undefined) post.video_url = video_url;
  await post.save();
  const obj = post.toObject();
  obj.id = obj._id;
  res.json(obj);
});

// DELETE /api/posts/:id – owner remove.
router.delete('/:id', requireAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  if (post.userId !== req.auth.userId) return res.status(403).json({ error: 'Forbidden' });
  await post.deleteOne();
  res.status(204).end();
});

// POST /api/posts/:id/like – toggle like.
router.post('/:id/like', requireAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  const idx = post.likes.indexOf(req.auth.userId);
  if (idx === -1) post.likes.push(req.auth.userId); else post.likes.splice(idx, 1);
  await post.save();
  if (idx === -1) {
    createNotification({ userId: post.userId, actorId: req.auth.userId, type: 'like', entityType: 'post', entityId: post._id });
  }
  res.json({ likes: post.likes, liked: idx === -1 });
});

// POST /api/posts/:id/comments – append comment.
router.post('/:id/comments', requireAuth, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  post.comments.push({ userId: req.auth.userId, content });
  await post.save();
  createNotification({ userId: post.userId, actorId: req.auth.userId, type: 'comment', entityType: 'post', entityId: post._id });
  const saved = post.comments[post.comments.length - 1];
  // enrich saved comment with user data (minimal)
  const userMap = await ensureUsersLoaded([saved.userId]);
  const enriched = {
    ...saved.toObject(),
    id: saved._id,
    user: userMap[saved.userId] ? {
      full_name: userMap[saved.userId].full_name || saved.userId,
      username: userMap[saved.userId].username || saved.userId,
      profile_picture: userMap[saved.userId].profile_picture || '/default-avatar.png'
    } : { full_name: saved.userId, username: saved.userId, profile_picture: '/default-avatar.png' }
  };
  res.status(201).json(enriched);
});

// DELETE /api/posts/:id/comments/:commentId – remove own comment.
router.delete('/:id/comments/:commentId', requireAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  const comment = post.comments.id(req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
    // Allow deletion by comment author OR post owner
    if (comment.userId !== req.auth.userId && post.userId !== req.auth.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  comment.deleteOne();
  await post.save();
  res.status(204).end();
});

export default router;
