import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  clerkId: { type: String, index: true, unique: true },
  full_name: String,
  username: { type: String, index: true },
  email: { type: String, index: true },
  bio: String,
  profile_picture: String,
  cover_picture: String,
  website: String,
  location: String,
  followers: [{ type: String }], // arrays of Clerk user ids
  following: [{ type: String }],
  verified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
