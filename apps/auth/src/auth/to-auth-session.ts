import type { AuthSession } from '@meeteora/contracts';

interface BetterAuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
  };
  session: { id: string; userId: string; expiresAt: Date };
}

/** Narrows Better Auth's session to the wire shape: no token, IP or user agent. */
export function toAuthSession({ user, session }: BetterAuthSession): AuthSession {
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image ?? null,
    },
    session: {
      id: session.id,
      userId: session.userId,
      expiresAt: new Date(session.expiresAt).toISOString(),
    },
  };
}
