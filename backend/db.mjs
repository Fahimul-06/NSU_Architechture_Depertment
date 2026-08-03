import mongoose from 'mongoose';

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured. Add it to .env locally or Render Environment Variables.');
  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || undefined,
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 20,
    minPoolSize: 1
  });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

export async function closeDatabase() { await mongoose.disconnect(); }
