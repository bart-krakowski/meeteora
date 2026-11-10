export const AuthPatterns = {
  health: 'auth.health',
  getSession: 'auth.session.get',
} as const;

/**
 * Headers forwarded from the original request. Only `cookie` and
 * `authorization` are read; the auth service resolves the session from them.
 */
export interface GetSessionRequest {
  headers: {
    cookie?: string;
    authorization?: string;
  };
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
}

export interface AuthSession {
  user: AuthUser;
  session: {
    id: string;
    userId: string;
    expiresAt: string;
  };
}

/** `null` when the request carries no valid session. */
export type GetSessionResponse = AuthSession | null;
