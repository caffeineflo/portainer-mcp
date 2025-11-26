import type { PortainerClient } from "../client.js";
import { EnvironmentIdSchema, ManageVolumeSchema } from "../schemas.js";
import { formatResponse, type ToolResponse } from "./utils.js";

export async function listVolumes(
  client: PortainerClient,
  args: unknown
): Promise<ToolResponse> {
  const parsed = EnvironmentIdSchema.parse(args);
  const result = await client.getVolumes(parsed.environment_id);
  return formatResponse({
    items: (result.Volumes || []).map((v) => ({
      name: v.Name,
      driver: v.Driver,
      mountpoint: v.Mountpoint,
    })),
    count: result.Volumes?.length || 0,
  });
}

export async function manageVolume(
  client: PortainerClient,
  args: unknown
): Promise<ToolResponse> {
  const parsed = ManageVolumeSchema.parse(args);
  if (parsed.action === "create") {
    const vol = await client.createVolume(parsed.environment_id, parsed.name);
    return formatResponse({
      success: true,
      name: vol.Name,
      mountpoint: vol.Mountpoint,
    });
  } else {
    await client.removeVolume(parsed.environment_id, parsed.name);
    return formatResponse({
      success: true,
      message: `Volume ${parsed.name} removed`,
    });
  }
}
