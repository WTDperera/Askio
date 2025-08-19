import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Clerk user id
  content: { type: String, required: true },
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  content: { type: String, trim: true },
  image_urls: [{ type: String }],
  video_url: String,
  likes: [{ type: String }], // array of Clerk user ids
  comments: [commentSchema]
}, { timestamps: true });

export default mongoose.model('Post', postSchema);
