import Story from '../models/Story.js';

// Starts a lightweight periodic cleanup of expired stories as a safety net
// in case the MongoDB TTL monitor is delayed or TTL index creation lags.
// Mongo's TTL index (expiresAt with expireAfterSeconds:0) should normally
// remove documents automatically shortly after their expiresAt timestamp.
// This job just guarantees eventual cleanup in dev / misconfigured envs.
export function startStoryCleanup() {
  const run = async () => {
    try {
      const now = new Date();
      const res = await Story.deleteMany({ expiresAt: { $lte: now } });
      if (res.deletedCount) {
        console.log(`[story-cleanup] Removed ${res.deletedCount} expired stories`);
      }
    } catch (e) {
      console.error('[story-cleanup] error', e.message || e);
    }
  };
  // Initial delayed run (give DB connection time & index sync)
  setTimeout(run, 15 * 1000);
  // Hourly thereafter (tweak via STORY_CLEANUP_INTERVAL_MS env if needed)
  const interval = parseInt(process.env.STORY_CLEANUP_INTERVAL_MS || '', 10) || (60 * 60 * 1000);
  setInterval(run, interval);
}
