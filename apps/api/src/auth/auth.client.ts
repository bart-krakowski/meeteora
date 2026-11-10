import {
  AuthPatterns,
  type GetSessionRequest,
  type GetSessionResponse,
} from "@meeteora/contracts";
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom, timeout } from "rxjs";

export const AUTH_SERVICE = Symbol("AUTH_SERVICE");

const REQUEST_TIMEOUT_MS = 5000;

@Injectable()
export class AuthClient {
  @Inject(AUTH_SERVICE)
  private readonly client: ClientProxy;

  async getSession(request: GetSessionRequest): Promise<GetSessionResponse> {
    try {
      return await firstValueFrom(
        this.client
          .send<GetSessionResponse>(AuthPatterns.getSession, request)
          .pipe(timeout(REQUEST_TIMEOUT_MS)),
      );
    } catch (error) {
      throw new ServiceUnavailableException("Auth service failed", {
        cause: error,
      });
    }
  }
}
