import type { PortainerClient } from "../client.js";
import { EnvironmentIdSchema, ManageImageSchema } from "../schemas.js";
import { formatResponse, type ToolResponse } from "./utils.js";

export async function listImages(
  client: PortainerClient,
  args: unknown
): Promise<ToolResponse> {
  const parsed = EnvironmentIdSchema.parse(args);
  const images = await client.getImages(parsed.environment_id);
  return formatResponse({
    items: images.map((i) => ({
      id: i.Id.replace("sha256:", "").substring(0, 12),
      tags: i.RepoTags || ["<none>"],
      size_mb: Math.round(i.Size / 1024 / 1024),
      created: new Date(i.Created * 1000).toISOString(),
    })),
    count: images.length,
  });
}

export async function manageImage(
  client: PortainerClient,
  args: unknown
): Promise<ToolResponse> {
  const parsed = ManageImageSchema.parse(args);
  if (parsed.action === "pull") {
    await client.pullImage(parsed.environment_id, parsed.image);
  } else {
    await client.removeImage(parsed.environment_id, parsed.image);
  }
  return formatResponse({
    success: true,
    message: `Image ${parsed.action} completed`,
  });
}
