import type { AuthSession, GetSessionRequest } from "@meeteora/contracts";
import { UnauthorizedException } from "@nestjs/common";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import { AuthClient } from "./auth.client";
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
  const context = new ExecutionContextHost([request]);
  return { context, request };
}

class FakeAuthClient extends AuthClient {
  readonly calls: Array<GetSessionRequest> = [];

  constructor(private readonly result: AuthSession | null) {
    super();
  }

  override async getSession(request: GetSessionRequest) {
    this.calls.push(request);
    return this.result;
  }
}

function guardReturning(result: AuthSession | null) {
  const client = new FakeAuthClient(result);
  return { guard: new AuthGuard(client), calls: client.calls };
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
