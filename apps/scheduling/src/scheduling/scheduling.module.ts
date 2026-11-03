import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SCHEDULING_EVENTS_EXCHANGE } from '@scheduler/contracts';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { OutboxRelay, SCHEDULING_EVENTS_CLIENT } from './outbox.relay';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SCHEDULING_EVENTS_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_URL')],
            exchange: SCHEDULING_EVENTS_EXCHANGE,
            exchangeType: 'topic',
            wildcards: true,
            persistent: true,
          },
        }),
      },
    ]),
  ],
  controllers: [SlotsController, BookingsController],
  providers: [SlotsService, BookingsService, OutboxRelay],
})
export class SchedulingModule {}
