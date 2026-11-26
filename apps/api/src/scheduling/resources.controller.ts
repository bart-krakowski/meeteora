import type { Resource, UpdateResourceRequest } from "@meeteora/contracts";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { SchedulingClient } from "./scheduling.client";

interface ResourceBody {
  name?: unknown;
  capacity?: unknown;
  weekly?: unknown;
  daysOff?: unknown;
}

function requireName(body: ResourceBody): string {
  if (typeof body.name !== "string" || !body.name.trim()) {
    throw new BadRequestException("name must be a non-empty string");
  }
  return body.name;
}

function requireCapacity(body: ResourceBody): number {
  const { capacity } = body;
  if (typeof capacity !== "number" || !Number.isInteger(capacity) || capacity < 1) {
    throw new BadRequestException("capacity must be a positive integer");
  }
  return capacity;
}

type ResourceChanges = Omit<UpdateResourceRequest, "id">;

/**
 * A PATCH may change any of name, capacity, weekly hours and days off.
 * Hours are only shape-checked here; the scheduling service validates them.
 */
function resourceChanges(body: ResourceBody): ResourceChanges {
  const changes: ResourceChanges = {};
  if (body.name !== undefined) changes.name = requireName(body);
  if (body.capacity !== undefined) changes.capacity = requireCapacity(body);
  if (body.weekly !== undefined) {
    if (typeof body.weekly !== "object" || body.weekly === null) {
      throw new BadRequestException("weekly must be an object");
    }
    changes.weekly = body.weekly as ResourceChanges["weekly"];
  }
  if (body.daysOff !== undefined) {
    if (!Array.isArray(body.daysOff)) {
      throw new BadRequestException("daysOff must be a list");
    }
    changes.daysOff = body.daysOff as Array<string>;
  }
  if (Object.keys(changes).length === 0) {
    throw new BadRequestException("Nothing to update");
  }
  return changes;
}

@Controller("resources")
@UseGuards(AuthGuard)
export class ResourcesController {
  constructor(
    @Inject(SchedulingClient) private readonly scheduling: SchedulingClient,
  ) {}

  @Get()
  list(): Promise<Array<Resource>> {
    return this.scheduling.listResources();
  }

  @Post()
  create(@Body() body: ResourceBody): Promise<Resource> {
    return this.scheduling.createResource({
      name: requireName(body),
      ...(body.capacity !== undefined && { capacity: requireCapacity(body) }),
    });
  }

  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: ResourceBody,
  ): Promise<Resource> {
    return this.scheduling.updateResource({ id, ...resourceChanges(body) });
  }

  @Delete(":id")
  remove(@Param("id", new ParseUUIDPipe()) id: string): Promise<Resource> {
    return this.scheduling.deleteResource({ id });
  }
}
