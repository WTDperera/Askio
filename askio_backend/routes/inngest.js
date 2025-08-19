import express from 'express';
import { serve } from 'inngest/express';
import { inngest } from '../inngest.js';

// Background function example: would generate a thumbnail for first image (placeholder logic)
const functions = [
  inngest.createFunction({ id: 'generate-thumbnail', name: 'Generate Thumbnail' }, { event: 'post/created' }, async ({ event, step }) => {
    const { post } = event.data;
    if (!post.image_urls || !post.image_urls.length) return { skipped: true };
    // Placeholder: in real scenario, generate thumbnail here
    await step.sleep('wait-a-sec', 500);
    return { ok: true, firstImage: post.image_urls[0] };
  }),
];

const router = express.Router();

router.use('/api/inngest', serve({ client: inngest, functions }));

export default router;
