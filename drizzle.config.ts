import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";  // Changed to import *

// Load environment variables
dotenv.config({ path: ".env.production" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Ensure the database is provisioned.");
}

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    table: "migrations",
    schema: "public",
  },
  verbose: true,
  strict: true,
});
