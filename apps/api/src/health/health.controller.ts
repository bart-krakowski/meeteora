import { Controller, Get, Inject } from '@nestjs/common';
import type { HealthResponse } from '@meeteora/contracts';
import { SchedulingClient } from '../scheduling/scheduling.client';

@Controller('health')
export class HealthController {
  constructor(@Inject(SchedulingClient) private readonly scheduling: SchedulingClient) {}

  @Get()
  check(): Promise<HealthResponse> {
    return this.scheduling.health();
  }
}
