import Notification from '../models/Notification.js';

export async function createNotification({ userId, actorId, type, entityType, entityId, message }) {
  if (userId === actorId) return; // skip self
  try {
    await Notification.create({ userId, actorId, type, entityType, entityId, message });
  } catch (e) {
    console.error('[notify] create failed', e.message || e);
  }
}

export async function bulkMarkRead(userId) {
  await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
}
