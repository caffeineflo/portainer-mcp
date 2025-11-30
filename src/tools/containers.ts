import type { PortainerClient } from "../client.js";
import {
  ListContainersSchema,
  InspectContainerSchema,
  ContainerLogsSchema,
  ContainerActionSchema,
  ContainerStatsSchema,
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

export async function containerStats(
  client: PortainerClient,
  args: unknown
): Promise<ToolResponse> {
  const parsed = ContainerStatsSchema.parse(args);
  const stats = await client.getContainerStats(
    parsed.environment_id,
    parsed.container_id
  );

  // Calculate CPU percentage
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100 : 0;

  // Calculate memory percentage
  const memoryUsage = stats.memory_stats.usage;
  const memoryLimit = stats.memory_stats.limit;
  const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;

  // Sum network I/O
  let networkRx = 0;
  let networkTx = 0;
  if (stats.networks) {
    for (const net of Object.values(stats.networks)) {
      networkRx += net.rx_bytes;
      networkTx += net.tx_bytes;
    }
  }

  return formatResponse({
    cpu_percent: Math.round(cpuPercent * 100) / 100,
    memory_usage_mb: Math.round(memoryUsage / 1024 / 1024 * 100) / 100,
    memory_limit_mb: Math.round(memoryLimit / 1024 / 1024 * 100) / 100,
    memory_percent: Math.round(memoryPercent * 100) / 100,
    network_rx_mb: Math.round(networkRx / 1024 / 1024 * 100) / 100,
    network_tx_mb: Math.round(networkTx / 1024 / 1024 * 100) / 100,
  });
}
