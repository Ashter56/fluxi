import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './server/db';

async function runMigrations() {
  console.log('🚀 Running database migrations...');
  await migrate(db, { migrationsFolder: './drizzle/migrations' });
  console.log('✅ Migrations completed');
}

runMigrations().catch(err => {
  console.error('❌ Migration failed', err);
  process.exit(1);
});
