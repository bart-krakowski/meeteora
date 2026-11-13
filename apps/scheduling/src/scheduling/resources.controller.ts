import { Controller, Inject } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  type CreateResourceRequest,
  type Resource,
  type ResourceIdRequest,
  SchedulingPatterns,
  type UpdateResourceRequest,
} from "@meeteora/contracts";
import { ResourcesService } from "./resources.service";

@Controller()
export class ResourcesController {
  constructor(
    @Inject(ResourcesService) private readonly resources: ResourcesService,
  ) {}

  @MessagePattern(SchedulingPatterns.listResources)
  list(): Promise<Array<Resource>> {
    return this.resources.list();
  }

  @MessagePattern(SchedulingPatterns.createResource)
  create(@Payload() request: CreateResourceRequest): Promise<Resource> {
    return this.resources.create(request);
  }

  @MessagePattern(SchedulingPatterns.updateResource)
  update(@Payload() request: UpdateResourceRequest): Promise<Resource> {
    return this.resources.update(request);
  }

  @MessagePattern(SchedulingPatterns.deleteResource)
  delete(@Payload() request: ResourceIdRequest): Promise<Resource> {
    return this.resources.delete(request);
  }
}
