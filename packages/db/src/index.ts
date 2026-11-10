import { accounts, sessions, users, verifications } from './auth-schema';

export * from './schema';

/** Table map for the Better Auth Drizzle adapter (`usePlural: true`). */
export const authSchema = { users, sessions, accounts, verifications };
export { createDatabase, type Database, type DatabaseExecutor } from './client';
export { MIGRATIONS_FOLDER, runMigrations } from './migrate';
