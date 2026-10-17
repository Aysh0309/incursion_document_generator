import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  if (!MONGODB_URI) {
    // Graceful fallback when MongoDB Atlas is not yet configured in local development
    return null;
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 1500,
      connectTimeoutMS: 1500,
      socketTimeoutMS: 1500,
    };

    // Race mongoose connect against a hard 1.5s timeout to prevent DNS querySrv hang
    const connectPromise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("MongoDB connection timed out after 1.5s")), 1500)
    );

    cached.promise = Promise.race([connectPromise, timeoutPromise]);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    return null;
  }

  return cached.conn;
}
