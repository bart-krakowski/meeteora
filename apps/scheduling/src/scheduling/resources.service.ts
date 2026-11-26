import { Inject, Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type {
  CreateResourceRequest,
  Resource,
  ResourceHours,
  ResourceIdRequest,
  RpcError,
  UpdateResourceRequest,
} from "@meeteora/contracts";
import { bookings, organizations, resources } from "@meeteora/db";
import type { SlotResource } from "@tanstack/time";
import { and, asc, eq, gt } from "drizzle-orm";
import {
  DATABASE,
  type Database,
  type DatabaseExecutor,
} from "../database/database";
import { storedHours, validDaysOff, validWeekly } from "./hours";

const DEFAULT_ORGANIZATION_SLUG = "default";
const MAX_NAME_LENGTH = 80;
const MAX_CAPACITY = 1000;

function rpcError(status: number, message: string): RpcException {
  return new RpcException({ status, message } satisfies RpcError);
}

function toResource(row: typeof resources.$inferSelect): Resource {
  return {
    id: row.id,
    name: row.name,
    capacity: row.capacity,
    ...storedHours(row),
  };
}

/** What slot generation needs per resource: capacity and its own hours. */
export interface SlotResourceWithHours {
  resource: SlotResource;
  hours: ResourceHours;
}

function validName(name: unknown): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) throw rpcError(400, "name must be a non-empty string");
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw rpcError(400, `name must be at most ${MAX_NAME_LENGTH} characters`);
  }
  return trimmed;
}

function validCapacity(capacity: unknown): number {
  if (
    typeof capacity !== "number" ||
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    capacity > MAX_CAPACITY
  ) {
    throw rpcError(
      400,
      `capacity must be an integer between 1 and ${MAX_CAPACITY}`,
    );
  }
  return capacity;
}

@Injectable()
export class ResourcesService {
  @Inject(DATABASE)
  private readonly db: Database;

  async list(): Promise<Array<Resource>> {
    const organizationId = await this.defaultOrganizationId(this.db);
    const rows = await this.db
      .select()
      .from(resources)
      .where(eq(resources.organizationId, organizationId))
      .orderBy(asc(resources.createdAt));
    return rows.map(toResource);
  }

  async create({ name, capacity }: CreateResourceRequest): Promise<Resource> {
    const organizationId = await this.defaultOrganizationId(this.db);
    const [row] = await this.db
      .insert(resources)
      .values({
        organizationId,
        name: validName(name),
        ...(capacity !== undefined && { capacity: validCapacity(capacity) }),
      })
      .returning();
    return toResource(row);
  }

  async update({
    id,
    name,
    capacity,
    weekly,
    daysOff,
  }: UpdateResourceRequest): Promise<Resource> {
    const changes: Partial<typeof resources.$inferInsert> = {};
    if (name !== undefined) changes.name = validName(name);
    if (capacity !== undefined) changes.capacity = validCapacity(capacity);
    if (weekly !== undefined) changes.weekly = validWeekly(weekly);
    if (daysOff !== undefined) changes.daysOff = validDaysOff(daysOff);
    if (Object.keys(changes).length === 0) {
      throw rpcError(400, "Nothing to update");
    }
    const [row] = await this.db
      .update(resources)
      .set(changes)
      .where(eq(resources.id, id))
      .returning();
    if (!row) throw rpcError(404, `Unknown resource: ${id}`);
    return toResource(row);
  }

  /** Refused while the resource holds confirmed bookings that haven't ended. */
  async delete({ id }: ResourceIdRequest): Promise<Resource> {
    return this.db.transaction(async (tx) => {
      const [upcoming] = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.resourceId, id),
            eq(bookings.status, "confirmed"),
            gt(bookings.endAt, new Date()),
          ),
        )
        .limit(1);
      if (upcoming) {
        throw rpcError(409, "Resource has upcoming bookings; cancel them first");
      }
      const [row] = await tx
        .delete(resources)
        .where(eq(resources.id, id))
        .returning();
      if (!row) throw rpcError(404, `Unknown resource: ${id}`);
      return toResource(row);
    });
  }

  /** Resources as the slot generator sees them (fresh on every call). */
  async listSlotResources(
    executor: DatabaseExecutor = this.db,
  ): Promise<Array<SlotResourceWithHours>> {
    const rows = await executor
      .select({
        id: resources.id,
        capacity: resources.capacity,
        weekly: resources.weekly,
        daysOff: resources.daysOff,
      })
      .from(resources)
      .orderBy(asc(resources.createdAt));
    return rows.map((row) => ({
      resource: { id: row.id, capacity: [row.capacity] },
      hours: storedHours(row),
    }));
  }

  private async defaultOrganizationId(
    executor: DatabaseExecutor,
  ): Promise<string> {
    const [organization] = await executor
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, DEFAULT_ORGANIZATION_SLUG));
    if (!organization) throw rpcError(500, "Default organization is missing");
    return organization.id;
  }
}
