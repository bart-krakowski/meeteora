import type { Resource } from "@meeteora/contracts";
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
}

function requireName(body: ResourceBody): string {
  if (typeof body.name !== "string" || !body.name.trim()) {
    throw new BadRequestException("name must be a non-empty string");
  }
  return body.name;
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
    return this.scheduling.createResource({ name: requireName(body) });
  }

  @Patch(":id")
  rename(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: ResourceBody,
  ): Promise<Resource> {
    return this.scheduling.updateResource({ id, name: requireName(body) });
  }

  @Delete(":id")
  remove(@Param("id", new ParseUUIDPipe()) id: string): Promise<Resource> {
    return this.scheduling.deleteResource({ id });
  }
}
