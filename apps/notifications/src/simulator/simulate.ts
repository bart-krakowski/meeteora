import { ClientRMQ } from '@nestjs/microservices';
import {
  type Booking,
  Events,
  SCHEDULING_EVENTS_EXCHANGE,
} from '@meeteora/contracts';
import { lastValueFrom } from 'rxjs';
import { cancelled, fakeBooking } from './fake-bookings';

const INTERVAL_MS = Number(process.env.SIMULATE_INTERVAL_MS ?? 3000);
const CANCEL_RATIO = Number(process.env.SIMULATE_CANCEL_RATIO ?? 0.3);
const RABBITMQ_URL = process.env.RABBITMQ_URL;

if (!RABBITMQ_URL) throw new Error('RABBITMQ_URL is not set');

const client = new ClientRMQ({
  urls: [RABBITMQ_URL],
  exchange: SCHEDULING_EVENTS_EXCHANGE,
  exchangeType: 'topic',
  wildcards: true,
});

const confirmed: Array<Booking> = [];

async function emit(pattern: string, booking: Booking): Promise<void> {
  await lastValueFrom(client.emit(pattern, booking), {
    defaultValue: undefined,
  });
  console.log(`${pattern} ${booking.attendee.name} ${booking.startAt}`);
}

async function tick(): Promise<void> {
  if (confirmed.length > 0 && Math.random() < CANCEL_RATIO) {
    const [booking] = confirmed.splice(
      Math.floor(Math.random() * confirmed.length),
      1,
    );
    await emit(Events.bookingCancelled, cancelled(booking));
    return;
  }
  const booking = fakeBooking();
  confirmed.push(booking);
  await emit(Events.bookingCreated, booking);
}

async function main(): Promise<void> {
  await client.connect();
  console.log(
    `Publishing a fake booking event every ${INTERVAL_MS}ms to ${SCHEDULING_EVENTS_EXCHANGE}. Ctrl+C to stop.`,
  );
  const timer = setInterval(() => {
    tick().catch((error: unknown) => console.error('Publish failed', error));
  }, INTERVAL_MS);
  const stop = () => {
    clearInterval(timer);
    void client.close();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

await main();
