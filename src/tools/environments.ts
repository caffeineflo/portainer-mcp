import type { PortainerClient } from "../client.js";
import { EnvironmentIdSchema } from "../schemas.js";
import { formatResponse, type ToolResponse } from "./utils.js";

export async function listEnvironments(client: PortainerClient): Promise<ToolResponse> {
  const envs = await client.getEnvironments();
  return formatResponse({
    items: envs.map((e) => ({
      id: e.Id,
      name: e.Name,
      status: e.Status === 1 ? "up" : "down",
      type: e.Type === 1 ? "docker" : e.Type === 2 ? "swarm" : "other",
      url: e.URL,
    })),
    count: envs.length,
  });
}

export async function environmentDashboard(
  client: PortainerClient,
  args: unknown
): Promise<ToolResponse> {
  const parsed = EnvironmentIdSchema.parse(args);
  const dashboard = await client.getDashboard(parsed.environment_id);
  return formatResponse({
    containers: {
      total: dashboard.containers.total,
      running: dashboard.containers.running,
      stopped: dashboard.containers.stopped,
      healthy: dashboard.containers.healthy,
      unhealthy: dashboard.containers.unhealthy,
    },
    images: {
      total: dashboard.images.total,
      size_mb: Math.round(dashboard.images.size / 1024 / 1024),
    },
    volumes: dashboard.volumes,
    networks: dashboard.networks,
    stacks: dashboard.stacks,
  });
}
