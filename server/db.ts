import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
if (!process.env.SUPABASE_DB_URL) {
  throw new Error(
    "https://mderzopunqstlutulpta.supabase.co"
  );
}

export const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

export const db = drizzle(pool, { schema });
