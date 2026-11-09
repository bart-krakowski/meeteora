import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from './client';

/** Migrations ship with the package: `<package>/drizzle`, next to `dist` and `src`. */
export const MIGRATIONS_FOLDER = fileURLToPath(
  new URL('../drizzle', import.meta.url),
);

export async function runMigrations(url: string): Promise<void> {
  const { db, pool } = createDatabase(url);
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }
}
