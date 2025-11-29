import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const environmentTools: Tool[] = [
  {
    name: "list_environments",
    description: "List all Portainer environments (Docker endpoints)",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

export const containerTools: Tool[] = [
  {
    name: "list_containers",
    description: "List containers in a Portainer environment",
    inputSchema: {
      type: "object" as const,
      properties: {
        environment_id: { type: "number", description: "Portainer environment ID" },
        all: { type: "boolean", description: "Include stopped containers" },
      },
      required: ["environment_id"],
    },
  },
  {
    name: "inspect_container",
    description: "Get detailed information about a container",
    inputSchema: {
      type: "object" as const,
      properties: {
        environment_id: { type: "number", description: "Portainer environment ID" },
        container_id: { type: "string", description: "Container ID or name" },
      },
      required: ["environment_id", "container_id"],
    },
  },
  {
    name: "container_logs",
    description: "Get logs from a container",
    inputSchema: {
      type: "object" as const,
      properties: {
        environment_id: { type: "number", description: "Portainer environment ID" },
        container_id: { type: "string", description: "Container ID or name" },
        tail: { type: "number", description: "Number of lines (default 100, max 10000)" },
      },
      required: ["environment_id", "container_id"],
    },
  },
  {
    name: "container_action",
    description: "Perform an action on a container (start, stop, restart, kill, remove). Requires PORTAINER_WRITE_ENABLED=true",
    inputSchema: {
      type: "object" as const,
      properties: {
        environment_id: { type: "number", description: "Portainer environment ID" },
        container_id: { type: "string", description: "Container ID or name" },
        action: { type: "string", enum: ["start", "stop", "restart", "kill", "remove"], description: "Action to perform" },
      },
      required: ["environment_id", "container_id", "action"],
    },
  },
];

export const stackTools: Tool[] = [
  {
    name: "list_stacks",
    description: "List all stacks",
    inputSchema: {
      type: "object" as const,
      properties: {
        environment_id: { type: "number", description: "Filter by environment ID" },
      },
      required: [],
    },
  },
  {
    name: "inspect_stack",
    description: "Get stack details including compose file content",
    inputSchema: {
      type: "object" as const,
      properties: {
        stack_id: { type: "number", description: "Stack ID" },
      },
      required: ["stack_id"],
    },
  },
  {
    name: "stack_action",
    description: "Perform an action on a stack (start, stop, remove). Requires PORTAINER_WRITE_ENABLED=true",
    inputSchema: {
      type: "object" as const,
      properties: {
        stack_id: { type: "number", description: "Stack ID" },
        action: { type: "string", enum: ["start", "stop", "remove"], description: "Action to perform" },
        environment_id: { type: "number", description: "Required for remove action" },
      },
      required: ["stack_id", "action"],
    },
  },
  {
    name: "create_stack",
    description: "Create a new standalone Docker Compose stack. Requires PORTAINER_WRITE_ENABLED=true",
    inputSchema: {
      type: "object" as const,
      properties: {
        environment_id: { type: "number", description: "Portainer environment ID" },
        name: { type: "string", description: "Stack name" },
        compose_content: { type: "string", description: "Docker Compose YAML content" },
        env: {
          type: "array",
          description: "Environment variables for the stack",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Variable name" },
              value: { type: "string", description: "Variable value" },
            },
            required: ["name", "value"],
          },
        },
      },
      required: ["environment_id", "name", "compose_content"],
    },
  },
];

export const imageTools: Tool[] = [
  {
    name: "list_images",
    description: "List Docker images in an environment",
    inputSchema: {
      type: "object" as const,
      properties: {
        environment_id: { type: "number", description: "Portainer environment ID" },
      },
      required: ["environment_id"],
    },
  },
  {
    name: "manage_image",
    description: "Pull or remove a Docker image. Requires PORTAINER_WRITE_ENABLED=true",
    inputSchema: {
      type: "object" as const,
      properties: {
        environment_id: { type: "number", description: "Portainer environment ID" },
        action: { type: "string", enum: ["pull", "remove"], description: "Action to perform" },
        image: { type: "string", description: "Image name:tag (for pull) or ID (for remove)" },
      },
      required: ["environment_id", "action", "image"],
    },
  },
];

export const volumeTools: Tool[] = [
  {
    name: "list_volumes",
    description: "List Docker volumes in an environment",
    inputSchema: {
      type: "object" as const,
      properties: {
        environment_id: { type: "number", description: "Portainer environment ID" },
      },
      required: ["environment_id"],
    },
  },
  {
    name: "manage_volume",
    description: "Create or remove a Docker volume. Requires PORTAINER_WRITE_ENABLED=true",
    inputSchema: {
      type: "object" as const,
      properties: {
        environment_id: { type: "number", description: "Portainer environment ID" },
        action: { type: "string", enum: ["create", "remove"], description: "Action to perform" },
        name: { type: "string", description: "Volume name" },
      },
      required: ["environment_id", "action", "name"],
    },
  },
];

export const networkTools: Tool[] = [
  {
    name: "list_networks",
    description: "List Docker networks in an environment",
    inputSchema: {
      type: "object" as const,
      properties: {
        environment_id: { type: "number", description: "Portainer environment ID" },
      },
      required: ["environment_id"],
    },
  },
  {
    name: "manage_network",
    description: "Create or remove a Docker network. Requires PORTAINER_WRITE_ENABLED=true",
    inputSchema: {
      type: "object" as const,
      properties: {
        environment_id: { type: "number", description: "Portainer environment ID" },
        action: { type: "string", enum: ["create", "remove"], description: "Action to perform" },
        name: { type: "string", description: "Network name (for create) or ID (for remove)" },
        subnet: { type: "string", description: "CIDR subnet for create (e.g., 172.20.0.0/16)" },
      },
      required: ["environment_id", "action", "name"],
    },
  },
];

export const allTools: Tool[] = [
  ...environmentTools,
  ...containerTools,
  ...stackTools,
  ...imageTools,
  ...volumeTools,
  ...networkTools,
];
