import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  AuthPatterns,
  type GetSessionRequest,
  type GetSessionResponse,
} from '@meeteora/contracts';
import { type Auth, AUTH } from './auth';
import { toAuthSession } from './to-auth-session';

/** RPC entry for other services: resolve the session behind a request's headers. */
@Controller()
export class SessionController {
  constructor(@Inject(AUTH) private readonly auth: Auth) {}

  @MessagePattern(AuthPatterns.getSession)
  async getSession(
    @Payload() { headers }: GetSessionRequest,
  ): Promise<GetSessionResponse> {
    const forwarded = new Headers();
    if (headers?.cookie) forwarded.set('cookie', headers.cookie);
    if (headers?.authorization) forwarded.set('authorization', headers.authorization);
    if (!forwarded.has('cookie') && !forwarded.has('authorization')) return null;

    const result = await this.auth.api.getSession({ headers: forwarded });
    return result ? toAuthSession(result) : null;
  }
}
