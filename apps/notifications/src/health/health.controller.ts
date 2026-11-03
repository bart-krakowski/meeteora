import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@scheduler/contracts';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return { status: 'ok' };
  }
}
