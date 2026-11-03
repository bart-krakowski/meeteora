import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type RmqOptions, Transport } from '@nestjs/microservices';
import { SCHEDULING_EVENTS_EXCHANGE } from '@scheduler/contracts';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.connectMicroservice<RmqOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [config.getOrThrow<string>('RABBITMQ_URL')],
      exchange: SCHEDULING_EVENTS_EXCHANGE,
      exchangeType: 'topic',
      wildcards: true,
      queueOptions: { exclusive: true, autoDelete: true, durable: false },
      noAck: true,
    },
  });
  app.enableShutdownHooks();
  await app.startAllMicroservices();
  await app.listen(config.get<string>('NOTIFICATIONS_PORT') ?? 3002);
}
await bootstrap();
