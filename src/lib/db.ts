import mongoose from "mongoose";

/**
 * Next.js reloads modules on every edit in dev, which would open a new
 * connection pool each time. Cache the promise on globalThis so we reuse one.
 */
const cache = globalThis as unknown as {
  _mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

cache._mongoose ??= { conn: null, promise: null };

export async function connectDB() {
  // Read at call time, not at import time. Next loads .env before any app code
  // so either works there, but a plain script imports modules first and reads
  // its .env second, and then this file has already cached `undefined`.
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env.local and fill it in."
    );
  }
  if (cache._mongoose!.conn) return cache._mongoose!.conn;

  cache._mongoose!.promise ??= mongoose.connect(uri, {
    bufferCommands: false,
    maxPoolSize: 10,
  });

  cache._mongoose!.conn = await cache._mongoose!.promise;
  return cache._mongoose!.conn;
}
