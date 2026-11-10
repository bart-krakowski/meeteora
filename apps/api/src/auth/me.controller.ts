import type { AuthSession } from "@meeteora/contracts";
import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard, CurrentSession } from "./auth.guard";

@Controller("me")
@UseGuards(AuthGuard)
export class MeController {
  @Get()
  me(@CurrentSession() session: AuthSession): AuthSession {
    return session;
  }
}
