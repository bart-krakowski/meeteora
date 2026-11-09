import { RpcException } from '@nestjs/microservices';
import type { RpcError } from '@meeteora/contracts';

export function parseInstant(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RpcException({
      status: 400,
      message: `Invalid date: ${value}`,
    } satisfies RpcError);
  }
  return date;
}
