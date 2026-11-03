import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { BookingEventsController } from './notifications/booking-events.controller';
import { NotificationsHub } from './notifications/notifications.hub';
import { NotificationsStreamController } from './notifications/notifications-stream.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
  ],
  controllers: [
    HealthController,
    BookingEventsController,
    NotificationsStreamController,
  ],
  providers: [NotificationsHub],
})
export class AppModule {}
