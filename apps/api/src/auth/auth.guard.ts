import type { AuthSession } from "@meeteora/contracts";
import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthClient } from "./auth.client";

type AuthenticatedRequest = Request & { auth?: AuthSession };

/** Rejects requests without a valid session; resolves it through the auth service. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthClient) private readonly authClient: AuthClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { cookie, authorization } = request.headers;
    if (!cookie && !authorization) throw new UnauthorizedException();

    const session = await this.authClient.getSession({
      headers: { cookie, authorization },
    });
    if (!session) throw new UnauthorizedException();

    request.auth = session;
    return true;
  }
}

/** The session attached by `AuthGuard`. Only use on guarded handlers. */
export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthSession => {
    const session = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>().auth;
    if (!session) throw new UnauthorizedException();
    return session;
  },
);
