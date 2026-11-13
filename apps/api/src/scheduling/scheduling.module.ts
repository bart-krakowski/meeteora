import { SCHEDULING_QUEUE } from "@meeteora/contracts";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { BookingsController } from "./bookings.controller";
import { EventTypesController } from "./event-types.controller";
import { ResourcesController } from "./resources.controller";
import { SCHEDULING_SERVICE, SchedulingClient } from "./scheduling.client";
import { SlotsController } from "./slots.controller";

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SCHEDULING_SERVICE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>("RABBITMQ_URL")],
            queue: SCHEDULING_QUEUE,
            queueOptions: { durable: true },
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
  providers: [SchedulingClient],
  exports: [SchedulingClient],
})
export class SchedulingModule {}
