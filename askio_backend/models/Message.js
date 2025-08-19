import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  from: { type: String, index: true, required: true }, // clerkId
  to: { type: String, index: true, required: true },   // clerkId
  conversation: { type: String, index: true }, // sorted pair key: a:b
  text: { type: String },
  message_type: { type: String, default: 'text' },
  media_url: { type: String },
  seen: { type: Boolean, default: false }
}, { timestamps: true });

messageSchema.pre('save', function(next) {
  if (!this.conversation) {
    const a = this.from < this.to ? this.from : this.to;
    const b = this.from < this.to ? this.to : this.from;
    this.conversation = `${a}:${b}`;
  }
  next();
});

export default mongoose.model('Message', messageSchema);
