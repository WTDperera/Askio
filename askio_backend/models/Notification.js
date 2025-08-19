import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // recipient (clerkId)
  actorId: { type: String, required: true, index: true }, // actor (clerkId)
  type: { type: String, enum: ['follow','like','comment','message'], required: true },
  entityType: { type: String, enum: ['user','post','comment','message'], required: true },
  entityId: { type: String, required: true },
  message: { type: String },
  read: { type: Boolean, default: false, index: true }
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
