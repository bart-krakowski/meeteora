import { AUTH_QUEUE } from "@meeteora/contracts";
import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { AUTH_SERVICE, AuthClient } from "./auth.client";
import { AuthGuard } from "./auth.guard";
import { MeController } from "./me.controller";

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>("RABBITMQ_URL")],
            queue: AUTH_QUEUE,
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  controllers: [MeController],
  providers: [AuthClient, AuthGuard],
  exports: [AuthClient, AuthGuard],
})
export class AuthModule {}
