import type { AuthSession, GetSessionRequest } from "@meeteora/contracts";
import { type ExecutionContext, UnauthorizedException } from "@nestjs/common";
import type { AuthClient } from "./auth.client";
import { AuthGuard } from "./auth.guard";

const session: AuthSession = {
  user: {
    id: "u1",
    name: "Ada",
    email: "ada@example.com",
    emailVerified: false,
    image: null,
  },
  session: { id: "s1", userId: "u1", expiresAt: "2026-12-01T00:00:00.000Z" },
};

function contextFor(headers: Record<string, string>) {
  const request: { headers: Record<string, string>; auth?: AuthSession } = {
    headers,
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function guardReturning(result: AuthSession | null) {
  const calls: Array<GetSessionRequest> = [];
  const client = {
    getSession: async (request: GetSessionRequest) => {
      calls.push(request);
      return result;
    },
  } as AuthClient;
  return { guard: new AuthGuard(client), calls };
}

describe("AuthGuard", () => {
  it("rejects without credentials and skips the auth service", async () => {
    const { guard, calls } = guardReturning(session);
    const { context } = contextFor({});
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(calls).toHaveLength(0);
  });

  it("rejects when the auth service finds no session", async () => {
    const { guard } = guardReturning(null);
    const { context } = contextFor({ cookie: "meeteora.session_token=x" });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("forwards the cookie and attaches the session", async () => {
    const { guard, calls } = guardReturning(session);
    const { context, request } = contextFor({
      cookie: "meeteora.session_token=x",
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(calls[0].headers.cookie).toBe("meeteora.session_token=x");
    expect(request.auth).toEqual(session);
  });
});
