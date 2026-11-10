import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { type RmqOptions, Transport } from '@nestjs/microservices';
import { AUTH_QUEUE } from '@meeteora/contracts';
import { toNodeHandler } from 'better-auth/node';
import { type Auth, AUTH } from './auth/auth';
import { AppModule } from './app.module';

async function bootstrap() {
  // Better Auth reads raw request bodies; Nest's JSON parser would consume them first.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const config = app.get(ConfigService);

  app
    .getHttpAdapter()
    .getInstance()
    .all('/api/auth/{*path}', toNodeHandler(app.get<Auth>(AUTH)));

  app.connectMicroservice<RmqOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [config.getOrThrow<string>('RABBITMQ_URL')],
      queue: AUTH_QUEUE,
      queueOptions: { durable: true },
    },
  });
  app.enableShutdownHooks();
  await app.startAllMicroservices();
  await app.listen(config.get<string>('AUTH_PORT') ?? 3003);
}
await bootstrap();
