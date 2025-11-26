import type { PortainerClient } from "../client.js";
import {
  ListContainersSchema,
  InspectContainerSchema,
  ContainerLogsSchema,
  ContainerActionSchema,
} from "../schemas.js";
import { formatResponse, type ToolResponse } from "./utils.js";

export async function listContainers(
  client: PortainerClient,
  args: unknown
): Promise<ToolResponse> {
  const parsed = ListContainersSchema.parse(args);
  const containers = await client.getContainers(parsed.environment_id, parsed.all);
  return formatResponse({
    items: containers.map((c) => ({
      id: c.Id.substring(0, 12),
      name: c.Names[0]?.replace(/^\//, ""),
      image: c.Image,
      state: c.State,
      status: c.Status,
      ports: c.Ports.filter((p) => p.PublicPort).map(
        (p) => `${p.PublicPort}:${p.PrivatePort}/${p.Type}`
      ),
    })),
    count: containers.length,
  });
}

export async function inspectContainer(
  client: PortainerClient,
  args: unknown
): Promise<ToolResponse> {
  const parsed = InspectContainerSchema.parse(args);
  const container = await client.inspectContainer(
    parsed.environment_id,
    parsed.container_id
  );
  return formatResponse({
    id: container.Id,
    name: container.Name.replace(/^\//, ""),
    image: container.Config.Image,
    state: container.State,
    config: {
      env: container.Config.Env,
      cmd: container.Config.Cmd,
      labels: container.Config.Labels,
    },
    networks: container.NetworkSettings.Networks,
    mounts: container.Mounts,
  });
}

export async function containerLogs(
  client: PortainerClient,
  args: unknown
): Promise<ToolResponse> {
  const parsed = ContainerLogsSchema.parse(args);
  const logs = await client.getContainerLogs(
    parsed.environment_id,
    parsed.container_id,
    parsed.tail
  );
  return formatResponse({ logs });
}

export async function containerAction(
  client: PortainerClient,
  args: unknown
): Promise<ToolResponse> {
  const parsed = ContainerActionSchema.parse(args);
  await client.containerAction(
    parsed.environment_id,
    parsed.container_id,
    parsed.action
  );
  return formatResponse({
    success: true,
    message: `Container ${parsed.action} completed`,
  });
}
