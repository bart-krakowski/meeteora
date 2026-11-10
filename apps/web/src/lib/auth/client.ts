import { createAuthClient } from 'better-auth/react';

/** Talks to `/api/auth/*` on the current origin, proxied to the auth service. */
export const authClient = createAuthClient();
