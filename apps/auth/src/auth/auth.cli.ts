/**
 * Entry for the Better Auth CLI only (`pnpm --filter auth auth:generate`).
 * The CLI needs an `auth` export; the database is never queried.
 */
import type { Database } from '@meeteora/db';
import { createAuth } from './auth';

export const auth = createAuth({
  // A stand-in: the CLI only reads the schema, it never runs a query.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  db: {} as Database,
  secret: 'cli-only-secret-not-used-at-runtime',
  baseURL: 'http://localhost:3000',
  trustedOrigins: [],
});
