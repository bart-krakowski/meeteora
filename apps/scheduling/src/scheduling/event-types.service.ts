import { Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import type {
  CreateEventTypeRequest,
  EventType,
  EventTypeIdRequest,
  RpcError,
} from '@meeteora/contracts';
import type { SlotRule } from '@tanstack/time';
import { asc, eq } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
  type DatabaseExecutor,
} from '../database/database';
import { eventTypes, organizations } from '@meeteora/db';
import { CALENDAR_ID, resources, RULE_DEFAULTS } from './schedule';

const DEFAULT_ORGANIZATION_SLUG = 'default';
const SLUG_PATTERN = /^[a-z0-9-]+$/;
const PG_UNIQUE_VIOLATION = '23505';

function rpcError(status: number, message: string): RpcException {
  return new RpcException({ status, message } satisfies RpcError);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toEventType(row: typeof eventTypes.$inferSelect): EventType {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    durationMinutes: row.durationMinutes,
  };
}

function toSlotRule(row: typeof eventTypes.$inferSelect): SlotRule {
  return {
    id: row.id,
    calendarId: CALENDAR_ID,
    duration: row.durationMinutes,
    ...RULE_DEFAULTS,
    resourceIds: resources.map((resource) => resource.id),
  };
}

@Injectable()
export class EventTypesService {
  @Inject(DATABASE)
  private readonly db: Database;

  async list(): Promise<Array<EventType>> {
    const organizationId = await this.defaultOrganizationId(this.db);
    const rows = await this.db
      .select()
      .from(eventTypes)
      .where(eq(eventTypes.organizationId, organizationId))
      .orderBy(asc(eventTypes.createdAt));
    return rows.map(toEventType);
  }

  async create({
    name,
    slug,
    durationMinutes,
  }: CreateEventTypeRequest): Promise<EventType> {
    const trimmed = name.trim();
    if (!trimmed) throw rpcError(400, 'name must be a non-empty string');
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 5 ||
      durationMinutes > 480
    ) {
      throw rpcError(400, 'durationMinutes must be an integer between 5 and 480');
    }
    const finalSlug = slug?.trim() || slugify(trimmed);
    if (!SLUG_PATTERN.test(finalSlug)) {
      throw rpcError(400, 'slug must be kebab-case (a-z, 0-9, dashes)');
    }
    const organizationId = await this.defaultOrganizationId(this.db);
    try {
      const [row] = await this.db
        .insert(eventTypes)
        .values({
          organizationId,
          slug: finalSlug,
          name: trimmed,
          durationMinutes,
        })
        .returning();
      return toEventType(row);
    } catch (error) {
      if ((error as { code?: string }).code === PG_UNIQUE_VIOLATION) {
        throw rpcError(409, `Event type slug is taken: ${finalSlug}`);
      }
      throw error;
    }
  }

  async delete({ id }: EventTypeIdRequest): Promise<EventType> {
    const [row] = await this.db
      .delete(eventTypes)
      .where(eq(eventTypes.id, id))
      .returning();
    if (!row) throw rpcError(404, `Unknown event type: ${id}`);
    return toEventType(row);
  }

  /** Slot rules derived from stored event types (fresh on every call). */
  async listRules(
    executor: DatabaseExecutor = this.db,
  ): Promise<Array<SlotRule>> {
    const rows = await executor.select().from(eventTypes);
    return rows.map(toSlotRule);
  }

  private async defaultOrganizationId(
    executor: DatabaseExecutor,
  ): Promise<string> {
    const [organization] = await executor
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, DEFAULT_ORGANIZATION_SLUG));
    if (!organization) throw rpcError(500, 'Default organization is missing');
    return organization.id;
  }
}
