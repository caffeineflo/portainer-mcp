import type { PortainerClient } from "../client.js";
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
