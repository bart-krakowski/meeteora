import { Inject, Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type {
  CreateResourceRequest,
  Resource,
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

const DEFAULT_ORGANIZATION_SLUG = "default";
const MAX_NAME_LENGTH = 80;

function rpcError(status: number, message: string): RpcException {
  return new RpcException({ status, message } satisfies RpcError);
}

function toResource(row: typeof resources.$inferSelect): Resource {
  return { id: row.id, name: row.name };
}

function validName(name: unknown): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) throw rpcError(400, "name must be a non-empty string");
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw rpcError(400, `name must be at most ${MAX_NAME_LENGTH} characters`);
  }
  return trimmed;
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

  async create({ name }: CreateResourceRequest): Promise<Resource> {
    const organizationId = await this.defaultOrganizationId(this.db);
    const [row] = await this.db
      .insert(resources)
      .values({ organizationId, name: validName(name) })
      .returning();
    return toResource(row);
  }

  async update({ id, name }: UpdateResourceRequest): Promise<Resource> {
    const [row] = await this.db
      .update(resources)
      .set({ name: validName(name) })
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
  ): Promise<Array<SlotResource>> {
    const rows = await executor.select({ id: resources.id }).from(resources);
    return rows.map((row) => ({ id: row.id }));
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
