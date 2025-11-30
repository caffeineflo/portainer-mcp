import type { PortainerClient } from "../client.js";
import { formatResponse, type ToolResponse } from "./utils.js";

export async function systemInfo(client: PortainerClient): Promise<ToolResponse> {
  const [info, version] = await Promise.all([
    client.getSystemInfo(),
    client.getSystemVersion(),
  ]);
  return formatResponse({
    version: version.ServerVersion,
    edition: version.ServerEdition,
    latest_version: version.LatestVersion,
    update_available: version.UpdateAvailable,
    platform: info.platform,
    agents: info.agents,
    edge_agents: info.edgeAgents,
  });
}

export async function listRegistries(client: PortainerClient): Promise<ToolResponse> {
  const registries = await client.getRegistries();

  const typeMap: Record<number, string> = {
    1: "quay",
    2: "azure",
    3: "custom",
    4: "gitlab",
    5: "proget",
    6: "dockerhub",
    7: "ecr",
    8: "github",
  };

  return formatResponse({
    items: registries.map((r) => ({
      id: r.Id,
      name: r.Name,
      url: r.URL || r.BaseURL,
      type: typeMap[r.Type] || "unknown",
      authentication: r.Authentication,
    })),
    count: registries.length,
  });
}
