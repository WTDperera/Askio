import mongoose from 'mongoose';

const storySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  media_type: { type: String, enum: ['text','image','video'], required: true },
  media_url: String,
  content: String,
  background_color: String,
  expiresAt: { type: Date, index: { expires: 0 } } // TTL (expires value ignored; actual datetime stored in field)
}, { timestamps: true });

// We set expiresAt = now + 24h on creation; MongoDB TTL monitor later removes expired docs.

export default mongoose.model('Story', storySchema);
