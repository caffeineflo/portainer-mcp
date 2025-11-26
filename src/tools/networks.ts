import type { PortainerClient } from "../client.js";
import { EnvironmentIdSchema, ManageNetworkSchema } from "../schemas.js";
import { formatResponse, type ToolResponse } from "./utils.js";

export async function listNetworks(
  client: PortainerClient,
  args: unknown
): Promise<ToolResponse> {
  const parsed = EnvironmentIdSchema.parse(args);
  const networks = await client.getNetworks(parsed.environment_id);
  return formatResponse({
    items: networks.map((n) => ({
      id: n.Id.substring(0, 12),
      name: n.Name,
      driver: n.Driver,
      scope: n.Scope,
      subnet: n.IPAM?.Config?.[0]?.Subnet,
    })),
    count: networks.length,
  });
}

export async function manageNetwork(
  client: PortainerClient,
  args: unknown
): Promise<ToolResponse> {
  const parsed = ManageNetworkSchema.parse(args);
  if (parsed.action === "create") {
    const net = await client.createNetwork(
      parsed.environment_id,
      parsed.name,
      parsed.subnet
    );
    return formatResponse({
      success: true,
      id: net.Id,
      name: parsed.name,
    });
  } else {
    await client.removeNetwork(parsed.environment_id, parsed.name);
    return formatResponse({
      success: true,
      message: `Network removed`,
    });
  }
}
