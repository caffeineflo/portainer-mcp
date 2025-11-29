import type { PortainerClient } from "../client.js";
import {
  ListStacksSchema,
  InspectStackSchema,
  StackActionSchema,
  CreateStackSchema,
} from "../schemas.js";
import { formatResponse, type ToolResponse } from "./utils.js";

export async function listStacks(
  client: PortainerClient,
  args: unknown
): Promise<ToolResponse> {
  const parsed = ListStacksSchema.parse(args);
  let stacks = await client.getStacks();
  if (parsed.environment_id !== undefined) {
    stacks = stacks.filter((s) => s.EndpointId === parsed.environment_id);
  }
  return formatResponse({
    items: stacks.map((s) => ({
      id: s.Id,
      name: s.Name,
      status: s.Status === 1 ? "active" : "inactive",
      environment_id: s.EndpointId,
    })),
    count: stacks.length,
  });
}

export async function inspectStack(
  client: PortainerClient,
  args: unknown
): Promise<ToolResponse> {
  const parsed = InspectStackSchema.parse(args);
  const [stack, stackFile] = await Promise.all([
    client.getStack(parsed.stack_id),
    client.getStackFile(parsed.stack_id),
  ]);
  return formatResponse({
    id: stack.Id,
    name: stack.Name,
    status: stack.Status === 1 ? "active" : "inactive",
    environment_id: stack.EndpointId,
    compose_content: stackFile.StackFileContent,
  });
}

export async function stackAction(
  client: PortainerClient,
  args: unknown
): Promise<ToolResponse> {
  const parsed = StackActionSchema.parse(args);
  if (parsed.action === "remove") {
    if (!parsed.environment_id) {
      throw new Error("environment_id is required for remove action");
    }
    await client.deleteStack(parsed.stack_id, parsed.environment_id);
  } else {
    await client.stackAction(parsed.stack_id, parsed.action);
  }
  return formatResponse({
    success: true,
    message: `Stack ${parsed.action} completed`,
  });
}

export async function createStack(
  client: PortainerClient,
  args: unknown
): Promise<ToolResponse> {
  const parsed = CreateStackSchema.parse(args);
  const stack = await client.createStack(
    parsed.environment_id,
    parsed.name,
    parsed.compose_content,
    parsed.env
  );
  return formatResponse({
    success: true,
    id: stack.Id,
    name: stack.Name,
  });
}
