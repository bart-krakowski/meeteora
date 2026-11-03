import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { type ClientProxy } from '@nestjs/microservices';
import { sql } from 'drizzle-orm';
import { lastValueFrom } from 'rxjs';
import { DATABASE, type Database } from '../database/database';

export const SCHEDULING_EVENTS_CLIENT = Symbol('SCHEDULING_EVENTS_CLIENT');

const POLL_INTERVAL_MS = 1000;
const BATCH_SIZE = 50;
const RETENTION = '1 day';

interface OutboxRow extends Record<string, unknown> {
  id: string;
  topic: string;
  payload: unknown;
}

/**
 * Transactional outbox relay: publishes events written to the `outbox` table
 * to RabbitMQ, at-least-once. Rows are locked (FOR UPDATE SKIP LOCKED) inside
 * a transaction while publishing, then marked published; a crash rolls back
 * the lock and the batch is retried on the next poll. Consumers must be
 * idempotent or tolerate duplicates.
 */
@Injectable()
export class OutboxRelay implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelay.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  @Inject(DATABASE)
  private readonly db: Database;

  @Inject(SCHEDULING_EVENTS_CLIENT)
  private readonly events: ClientProxy;

  onModuleInit(): void {
    this.timer = setInterval(() => void this.flush(), POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async flush(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const published = await this.db.transaction(async (tx) => {
        const { rows } = await tx.execute<OutboxRow>(sql`
          select id, topic, payload from outbox
          where published_at is null
          order by created_at
          limit ${BATCH_SIZE}
          for update skip locked
        `);

        const done: Array<string> = [];
        for (const row of rows) {
          try {
            await lastValueFrom(this.events.emit(row.topic, row.payload), {
              defaultValue: undefined,
            });
            done.push(row.id);
          } catch (error) {
            // Stop the batch to preserve ordering; locked rows stay
            // unpublished and are retried once the lock rolls back.
            this.logger.error(`Failed to publish ${row.topic} (${row.id})`, error);
            break;
          }
        }

        if (done.length > 0) {
          await tx.execute(sql`
            update outbox set published_at = now()
            where id in (${sql.join(done.map((id) => sql`${id}::uuid`), sql`, `)})
          `);
        }
        return done.length;
      });

      await this.db.execute(sql`
        delete from outbox where published_at < now() - ${RETENTION}::interval
      `);

      if (published > 0) this.logger.debug(`Published ${published} outbox event(s)`);
    } catch (error) {
      this.logger.error('Outbox flush failed', error);
    } finally {
      this.running = false;
    }
  }
}
