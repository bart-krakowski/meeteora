import { Controller, Inject } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { type HealthResponse, SchedulingPatterns } from '@meeteora/contracts';
import { sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../database/database';

@Controller()
export class HealthController {
  @Inject(DATABASE)
  private readonly db: Database;

  @MessagePattern(SchedulingPatterns.health)
  async check(): Promise<HealthResponse> {
    await this.db.execute(sql`select 1`);
    return { status: 'ok' };
  }
}
