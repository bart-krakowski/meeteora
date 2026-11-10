import { authSchema, type Database } from "@meeteora/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export interface AuthOptions {
  db: Database;
  secret: string;
  /** Public origin users reach auth on: the web app, which proxies `/api/auth/*` here. */
  baseURL: string;
  trustedOrigins: Array<string>;
  /** OAuth apps; a provider is enabled only when its credentials are set. */
  social?: {
    google?: OAuthCredentials;
  };
}

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

export function createAuth({
  db,
  secret,
  baseURL,
  trustedOrigins,
  social = {},
}: AuthOptions) {
  return betterAuth({
    appName: "Meeteora",
    secret,
    baseURL,
    basePath: "/api/auth",
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
      usePlural: true,
    }),
    socialProviders: {
      ...(social.google && { google: social.google }),
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    session: {
      // Short-lived signed cookie lets most session reads skip the database.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    advanced: {
      cookiePrefix: "meeteora",
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

export const AUTH = Symbol("AUTH");
