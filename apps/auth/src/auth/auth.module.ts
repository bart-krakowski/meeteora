import { createDatabase } from "@meeteora/db";
import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Pool } from "pg";
import { AUTH, createAuth, type OAuthCredentials } from "./auth";
import { SessionController } from "./session.controller";

function credentials(
  config: ConfigService,
  prefix: string,
): OAuthCredentials | undefined {
  const clientId = config.get<string>(`${prefix}_CLIENT_ID`);
  const clientSecret = config.get<string>(`${prefix}_CLIENT_SECRET`);
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

export const CONNECTION = Symbol("CONNECTION");

@Global()
@Module({
  providers: [
    {
      provide: CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createDatabase(config.getOrThrow<string>("DATABASE_URL")),
    },
    {
      provide: AUTH,
      inject: [ConfigService, CONNECTION],
      useFactory: (
        config: ConfigService,
        { db }: ReturnType<typeof createDatabase>,
      ) => {
        const webOrigin =
          config.get<string>("WEB_ORIGIN") ?? "http://localhost:3000";
        return createAuth({
          db,
          secret: config.getOrThrow<string>("BETTER_AUTH_SECRET"),
          baseURL: config.get<string>("BETTER_AUTH_URL") ?? webOrigin,
          trustedOrigins: [webOrigin],
          social: {
            google: credentials(config, "GOOGLE"),
          },
        });
      },
    },
  ],
  controllers: [SessionController],
  exports: [AUTH, CONNECTION],
})
export class AuthModule implements OnApplicationShutdown {
  @Inject(CONNECTION)
  private readonly connection: { pool: Pool };

  async onApplicationShutdown() {
    await this.connection.pool.end();
  }
}
