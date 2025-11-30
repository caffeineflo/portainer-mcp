import type { PortainerClient } from "../client.js";
import { allTools } from "./definitions.js";
import { formatError, type ToolResponse } from "./utils.js";

// Environment handlers
import { listEnvironments } from "./environments.js";

// Container handlers
import {
  listContainers,
  inspectContainer,
  containerLogs,
  containerAction,
  containerStats,
} from "./containers.js";

// Stack handlers
import {
  listStacks,
  inspectStack,
  stackAction,
  createStack,
  updateStack,
  redeployStack,
} from "./stacks.js";

// Image handlers
import { listImages, manageImage } from "./images.js";

// Volume handlers
import { listVolumes, manageVolume } from "./volumes.js";

// Network handlers
import { listNetworks, manageNetwork } from "./networks.js";

export { allTools };
export { formatError, type ToolResponse };

export type ToolHandler = (
  client: PortainerClient,
  args: unknown
) => Promise<ToolResponse>;

const toolHandlers: Record<string, ToolHandler> = {
  // Environments
  list_environments: (client) => listEnvironments(client),

  // Containers
  list_containers: listContainers,
  inspect_container: inspectContainer,
  container_logs: containerLogs,
  container_action: containerAction,
  container_stats: containerStats,

  // Stacks
  list_stacks: listStacks,
  inspect_stack: inspectStack,
  stack_action: stackAction,
  create_stack: createStack,
  update_stack: updateStack,
  redeploy_stack: redeployStack,

  // Images
  list_images: listImages,
  manage_image: manageImage,

  // Volumes
  list_volumes: listVolumes,
  manage_volume: manageVolume,

  // Networks
  list_networks: listNetworks,
  manage_network: manageNetwork,
};

export async function handleToolCall(
  client: PortainerClient,
  name: string,
  args: unknown
): Promise<ToolResponse> {
  const handler = toolHandlers[name];
  if (!handler) {
    return formatError(new Error(`Unknown tool: ${name}`));
  }

  try {
    return await handler(client, args);
  } catch (error) {
    return formatError(error);
  }
}
