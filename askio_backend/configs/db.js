import mongoose from "mongoose";

let listenersBound = false;
let connecting = false;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return; // already connected
  if (connecting) return; // in progress
  connecting = true;

  if (!listenersBound) {
    mongoose.connection.on("connected", () => console.log("MongoDB connected"));
    mongoose.connection.on("error", (err) => console.error("MongoDB error:", err.message));
    mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected"));
    listenersBound = true;
  }

  try {
    if (!process.env.MONGODB_URL) {
      throw new Error("Missing MONGODB_URL env variable");
    }
    await mongoose.connect(process.env.MONGODB_URL, { dbName: "askio" });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message || error);
    throw error;
  } finally {
    connecting = false;
  }
};

export default connectDB;
