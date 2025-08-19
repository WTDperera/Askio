import express from 'express';
import fs from 'fs';
import path from 'path';
import Post from '../models/Post.js';
import Story from '../models/Story.js';

const router = express.Router();

// Diagnostics: compare files on disk vs references in DB.
router.get('/uploads-status', async (_req, res) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    let diskFiles = [];
    try { diskFiles = fs.readdirSync(uploadsDir); } catch { /* ignore */ }

    const posts = await Post.find({ $or: [{ image_urls: { $exists: true, $ne: [] } }, { video_url: { $exists: true, $ne: null } }] }).lean();
    const stories = await Story.find({ media_url: { $exists: true, $ne: null } }).lean();

    const referenced = new Set();
    posts.forEach(p => (p.image_urls||[]).forEach(u => referenced.add(u.replace('/uploads/',''))));
    posts.forEach(p => { if (p.video_url) referenced.add(p.video_url.replace('/uploads/','')); });
    stories.forEach(s => { if (s.media_url) referenced.add(s.media_url.replace('/uploads/','')); });

    const missing = [...referenced].filter(f => !diskFiles.includes(f));
    const orphan = diskFiles.filter(f => !referenced.has(f));

    res.json({ diskCount: diskFiles.length, referencedCount: referenced.size, missing, orphan, sampleFiles: diskFiles.slice(0,20) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
