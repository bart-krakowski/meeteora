import 'server-only';

import type { AuthSession } from '@meeteora/contracts';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

const AUTH_URL = process.env.AUTH_URL ?? 'http://localhost:3003';

interface BetterAuthSessionJson {
  user: AuthSession['user'] & { image?: string | null };
  session: AuthSession['session'];
}

/** The signed-in session for the current request, or `null`. Deduped per request. */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  const cookie = (await headers()).get('cookie');
  if (!cookie) return null;

  const response = await fetch(new URL('/api/auth/get-session', AUTH_URL), {
    headers: { cookie },
    cache: 'no-store',
  }).catch(() => undefined);
  if (!response?.ok) return null;

  const body = (await response.json()) as BetterAuthSessionJson | null;
  if (!body) return null;
  return {
    user: {
      id: body.user.id,
      name: body.user.name,
      email: body.user.email,
      emailVerified: body.user.emailVerified,
      image: body.user.image ?? null,
    },
    session: {
      id: body.session.id,
      userId: body.session.userId,
      expiresAt: body.session.expiresAt,
    },
  };
});

/** Redirects to sign-in when there is no session. */
export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  return session;
}
