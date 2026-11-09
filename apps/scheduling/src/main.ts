import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  type AsyncMicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { SCHEDULING_QUEUE } from '@meeteora/contracts';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<AsyncMicroserviceOptions>(
    AppModule,
    {
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: Transport.RMQ,
        options: {
          urls: [config.getOrThrow<string>('RABBITMQ_URL')],
          queue: SCHEDULING_QUEUE,
          queueOptions: { durable: true },
        },
      }),
    },
  );
  app.enableShutdownHooks();
  await app.listen();
}
await bootstrap();
