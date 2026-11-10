import { Controller, Get, Inject } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AuthPatterns, type HealthResponse } from '@meeteora/contracts';
import type { Pool } from 'pg';
import { CONNECTION } from '../auth/auth.module';

@Controller('health')
export class HealthController {
  constructor(@Inject(CONNECTION) private readonly connection: { pool: Pool }) {}

  @Get()
  async check(): Promise<HealthResponse> {
    await this.connection.pool.query('select 1');
    return { status: 'ok' };
  }

  @MessagePattern(AuthPatterns.health)
  rpcCheck(): Promise<HealthResponse> {
    return this.check();
  }
}
