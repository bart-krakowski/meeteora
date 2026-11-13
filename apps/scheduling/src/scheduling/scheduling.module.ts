import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { SCHEDULING_EVENTS_EXCHANGE } from "@meeteora/contracts";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { EventTypesController } from "./event-types.controller";
import { EventTypesService } from "./event-types.service";
import { OutboxRelay, SCHEDULING_EVENTS_CLIENT } from "./outbox.relay";
import { ResourcesController } from "./resources.controller";
import { ResourcesService } from "./resources.service";
import { SlotsController } from "./slots.controller";
import { SlotsService } from "./slots.service";

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SCHEDULING_EVENTS_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>("RABBITMQ_URL")],
            exchange: SCHEDULING_EVENTS_EXCHANGE,
            exchangeType: "topic",
            wildcards: true,
            persistent: true,
          },
        }),
      },
    ]),
  ],
  controllers: [
    SlotsController,
    BookingsController,
    EventTypesController,
    ResourcesController,
  ],
  providers: [
    SlotsService,
    BookingsService,
    EventTypesService,
    ResourcesService,
    OutboxRelay,
  ],
})
export class SchedulingModule {}
