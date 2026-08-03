import 'dotenv/config';
import { connectDatabase, closeDatabase } from '../db.mjs';
import { seedIfEmpty } from '../seed.mjs';
try { await connectDatabase(); await seedIfEmpty(true); } finally { await closeDatabase(); }
