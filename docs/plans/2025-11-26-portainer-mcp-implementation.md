# Portainer MCP Server Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP server that provides tools to interact with Portainer for Docker container management.

**Architecture:** TypeScript MCP server with a PortainerClient class wrapping the Portainer API. Tools organized in a hybrid pattern - common read operations as individual tools, write operations grouped. Read-only by default with opt-in writes.

**Tech Stack:** TypeScript, Node.js 18+, @modelcontextprotocol/sdk, zod, pnpm

---

### Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts` (placeholder)

**Step 1: Initialize package.json**

```json
{
  "name": "portainer-mcp",
  "version": "0.1.0",
  "description": "MCP server for Portainer Docker management",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "portainer-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "test": "node --test --experimental-strip-types src/**/*.test.ts"
  },
  "keywords": ["mcp", "portainer", "docker"],
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 3: Create placeholder entry point**

Create `src/index.ts`:
```typescript
#!/usr/bin/env node
console.log("Portainer MCP - placeholder");
```

**Step 4: Install dependencies**

Run: `pnpm install`
Expected: Dependencies installed, pnpm-lock.yaml created

**Step 5: Verify build works**

Run: `pnpm build`
Expected: `dist/index.js` created

**Step 6: Commit**

```bash
git add package.json tsconfig.json pnpm-lock.yaml src/index.ts
git commit -m "chore: initialize project with pnpm and TypeScript"
```

---

### Task 2: Portainer API Client - Core

**Files:**
- Create: `src/client.ts`
- Create: `src/types.ts`

**Step 1: Create types file**

Create `src/types.ts`:
```typescript
export interface PortainerEnvironment {
  Id: number;
  Name: string;
  Type: number;
  URL: string;
  Status: number;
  Snapshots?: Array<{
    DockerVersion: string;
    TotalCPU: number;
    TotalMemory: number;
  }>;
}

export interface DockerContainer {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Ports: Array<{
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }>;
  Created: number;
}

export interface DockerContainerInspect {
  Id: string;
  Name: string;
  Image: string;
  State: {
    Status: string;
    Running: boolean;
    Paused: boolean;
    Restarting: boolean;
    StartedAt: string;
    FinishedAt: string;
  };
  Config: {
    Image: string;
    Env: string[];
    Cmd: string[];
    Labels: Record<string, string>;
  };
  NetworkSettings: {
    Networks: Record<string, {
      IPAddress: string;
      Gateway: string;
    }>;
  };
  Mounts: Array<{
    Type: string;
    Source: string;
    Destination: string;
  }>;
}

export interface PortainerStack {
  Id: number;
  Name: string;
  Type: number;
  EndpointId: number;
  Status: number;
  CreationDate: number;
  UpdateDate: number;
}

export interface PortainerStackFile {
  StackFileContent: string;
}

export interface DockerImage {
  Id: string;
  RepoTags: string[];
  Size: number;
  Created: number;
}

export interface DockerVolume {
  Name: string;
  Driver: string;
  Mountpoint: string;
  CreatedAt: string;
  Labels: Record<string, string>;
}

export interface DockerNetwork {
  Id: string;
  Name: string;
  Driver: string;
  Scope: string;
  IPAM: {
    Config: Array<{
      Subnet?: string;
      Gateway?: string;
    }>;
  };
}

export interface PortainerError {
  message: string;
  details?: string;
}
```

**Step 2: Create client with environment methods**

Create `src/client.ts`:
```typescript
import {
  PortainerEnvironment,
  DockerContainer,
  DockerContainerInspect,
  PortainerStack,
  PortainerStackFile,
  DockerImage,
  DockerVolume,
  DockerNetwork,
} from "./types.js";

export class PortainerClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "PortainerClientError";
  }
}

export class PortainerClient {
  private baseUrl: string;
  private apiKey: string;
  private writeEnabled: boolean;

  constructor(baseUrl: string, apiKey: string, writeEnabled = false) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.writeEnabled = writeEnabled;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    timeout = 30000
  ): Promise<T> {
    const url = `${this.baseUrl}/api${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        let message = `Portainer API error: ${response.status}`;

        if (response.status === 401) {
          message = "Invalid API key or expired token";
        } else if (response.status === 403) {
          message = "Insufficient permissions for this operation";
        } else if (response.status === 404) {
          message = `Resource not found: ${path}`;
        } else {
          try {
            const parsed = JSON.parse(errorBody);
            message = parsed.message || parsed.details || message;
          } catch {
            // Use default message
          }
        }

        throw new PortainerClientError(
          message,
          `HTTP_${response.status}`,
          response.status
        );
      }

      const text = await response.text();
      if (!text) return {} as T;
      return JSON.parse(text) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof PortainerClientError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new PortainerClientError(
          `Request timeout after ${timeout}ms`,
          "TIMEOUT"
        );
      }
      throw new PortainerClientError(
        `Cannot connect to Portainer at ${this.baseUrl}: ${error}`,
        "CONNECTION_ERROR"
      );
    }
  }

  private checkWriteEnabled(): void {
    if (!this.writeEnabled) {
      throw new PortainerClientError(
        "Write operations disabled. Set PORTAINER_WRITE_ENABLED=true to enable.",
        "WRITE_DISABLED"
      );
    }
  }

  // Environments
  async getEnvironments(): Promise<PortainerEnvironment[]> {
    return this.request<PortainerEnvironment[]>("GET", "/endpoints");
  }

  async getEnvironment(id: number): Promise<PortainerEnvironment> {
    return this.request<PortainerEnvironment>("GET", `/endpoints/${id}`);
  }

  // Containers
  async getContainers(envId: number, all = false): Promise<DockerContainer[]> {
    const query = all ? "?all=true" : "";
    return this.request<DockerContainer[]>(
      "GET",
      `/endpoints/${envId}/docker/containers/json${query}`
    );
  }

  async inspectContainer(
    envId: number,
    containerId: string
  ): Promise<DockerContainerInspect> {
    return this.request<DockerContainerInspect>(
      "GET",
      `/endpoints/${envId}/docker/containers/${containerId}/json`
    );
  }

  async getContainerLogs(
    envId: number,
    containerId: string,
    tail = 100
  ): Promise<string> {
    const clampedTail = Math.min(Math.max(tail, 1), 10000);
    return this.request<string>(
      "GET",
      `/endpoints/${envId}/docker/containers/${containerId}/logs?stdout=true&stderr=true&tail=${clampedTail}`,
      undefined,
      60000
    );
  }

  async containerAction(
    envId: number,
    containerId: string,
    action: "start" | "stop" | "restart" | "kill" | "remove"
  ): Promise<void> {
    this.checkWriteEnabled();
    if (action === "remove") {
      await this.request<void>(
        "DELETE",
        `/endpoints/${envId}/docker/containers/${containerId}?force=true`
      );
    } else {
      await this.request<void>(
        "POST",
        `/endpoints/${envId}/docker/containers/${containerId}/${action}`
      );
    }
  }

  // Stacks
  async getStacks(): Promise<PortainerStack[]> {
    return this.request<PortainerStack[]>("GET", "/stacks");
  }

  async getStack(stackId: number): Promise<PortainerStack> {
    return this.request<PortainerStack>("GET", `/stacks/${stackId}`);
  }

  async getStackFile(stackId: number): Promise<PortainerStackFile> {
    return this.request<PortainerStackFile>("GET", `/stacks/${stackId}/file`);
  }

  async stackAction(
    stackId: number,
    action: "start" | "stop"
  ): Promise<void> {
    this.checkWriteEnabled();
    await this.request<void>("POST", `/stacks/${stackId}/${action}`);
  }

  async createStack(
    envId: number,
    name: string,
    composeContent: string
  ): Promise<PortainerStack> {
    this.checkWriteEnabled();
    return this.request<PortainerStack>(
      "POST",
      `/stacks/create/standalone/string?endpointId=${envId}`,
      {
        name,
        stackFileContent: composeContent,
      }
    );
  }

  async deleteStack(stackId: number, envId: number): Promise<void> {
    this.checkWriteEnabled();
    await this.request<void>(
      "DELETE",
      `/stacks/${stackId}?endpointId=${envId}`
    );
  }

  // Images
  async getImages(envId: number): Promise<DockerImage[]> {
    return this.request<DockerImage[]>(
      "GET",
      `/endpoints/${envId}/docker/images/json`
    );
  }

  async pullImage(envId: number, image: string): Promise<void> {
    this.checkWriteEnabled();
    const [fromImage, tag = "latest"] = image.split(":");
    await this.request<void>(
      "POST",
      `/endpoints/${envId}/docker/images/create?fromImage=${encodeURIComponent(fromImage)}&tag=${encodeURIComponent(tag)}`
    );
  }

  async removeImage(envId: number, imageId: string): Promise<void> {
    this.checkWriteEnabled();
    await this.request<void>(
      "DELETE",
      `/endpoints/${envId}/docker/images/${encodeURIComponent(imageId)}?force=true`
    );
  }

  // Volumes
  async getVolumes(envId: number): Promise<{ Volumes: DockerVolume[] }> {
    return this.request<{ Volumes: DockerVolume[] }>(
      "GET",
      `/endpoints/${envId}/docker/volumes`
    );
  }

  async createVolume(envId: number, name: string): Promise<DockerVolume> {
    this.checkWriteEnabled();
    return this.request<DockerVolume>(
      "POST",
      `/endpoints/${envId}/docker/volumes/create`,
      { Name: name }
    );
  }

  async removeVolume(envId: number, name: string): Promise<void> {
    this.checkWriteEnabled();
    await this.request<void>(
      "DELETE",
      `/endpoints/${envId}/docker/volumes/${encodeURIComponent(name)}`
    );
  }

  // Networks
  async getNetworks(envId: number): Promise<DockerNetwork[]> {
    return this.request<DockerNetwork[]>(
      "GET",
      `/endpoints/${envId}/docker/networks`
    );
  }

  async createNetwork(
    envId: number,
    name: string,
    subnet?: string
  ): Promise<{ Id: string }> {
    this.checkWriteEnabled();
    const body: Record<string, unknown> = { Name: name };
    if (subnet) {
      body.IPAM = { Config: [{ Subnet: subnet }] };
    }
    return this.request<{ Id: string }>(
      "POST",
      `/endpoints/${envId}/docker/networks/create`,
      body
    );
  }

  async removeNetwork(envId: number, networkId: string): Promise<void> {
    this.checkWriteEnabled();
    await this.request<void>(
      "DELETE",
      `/endpoints/${envId}/docker/networks/${networkId}`
    );
  }
}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: No errors

**Step 4: Commit**

```bash
git add src/types.ts src/client.ts
git commit -m "feat: add Portainer API client with full Docker operations"
```

---

### Task 3: MCP Server Entry Point

**Files:**
- Modify: `src/index.ts`

**Step 1: Implement MCP server with environment tools**

Replace `src/index.ts`:
```typescript
#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { PortainerClient, PortainerClientError } from "./client.js";

// Environment validation
const PORTAINER_URL = process.env.PORTAINER_URL;
const PORTAINER_API_KEY = process.env.PORTAINER_API_KEY;
const WRITE_ENABLED = process.env.PORTAINER_WRITE_ENABLED === "true";

if (!PORTAINER_URL || !PORTAINER_API_KEY) {
  console.error(
    "Error: PORTAINER_URL and PORTAINER_API_KEY environment variables are required"
  );
  process.exit(1);
}

const client = new PortainerClient(PORTAINER_URL, PORTAINER_API_KEY, WRITE_ENABLED);

// Tool schemas
const ListContainersSchema = z.object({
  environment_id: z.number().describe("Portainer environment ID"),
  all: z.boolean().optional().describe("Include stopped containers"),
});

const InspectContainerSchema = z.object({
  environment_id: z.number().describe("Portainer environment ID"),
  container_id: z.string().describe("Container ID or name"),
});

const ContainerLogsSchema = z.object({
  environment_id: z.number().describe("Portainer environment ID"),
  container_id: z.string().describe("Container ID or name"),
  tail: z.number().optional().describe("Number of lines (default 100, max 10000)"),
});

const ContainerActionSchema = z.object({
  environment_id: z.number().describe("Portainer environment ID"),
  container_id: z.string().describe("Container ID or name"),
  action: z.enum(["start", "stop", "restart", "kill", "remove"]).describe("Action to perform"),
});

const ListStacksSchema = z.object({
  environment_id: z.number().optional().describe("Filter by environment ID"),
});

const InspectStackSchema = z.object({
  stack_id: z.number().describe("Stack ID"),
});

const StackActionSchema = z.object({
  stack_id: z.number().describe("Stack ID"),
  action: z.enum(["start", "stop", "remove"]).describe("Action to perform"),
  environment_id: z.number().optional().describe("Required for remove action"),
});

const CreateStackSchema = z.object({
  environment_id: z.number().describe("Portainer environment ID"),
  name: z.string().describe("Stack name"),
  compose_content: z.string().describe("Docker Compose YAML content"),
});

const EnvironmentIdSchema = z.object({
  environment_id: z.number().describe("Portainer environment ID"),
});

const ManageImageSchema = z.object({
  environment_id: z.number().describe("Portainer environment ID"),
  action: z.enum(["pull", "remove"]).describe("Action to perform"),
  image: z.string().describe("Image name (for pull) or ID (for remove)"),
});

const ManageVolumeSchema = z.object({
  environment_id: z.number().describe("Portainer environment ID"),
  action: z.enum(["create", "remove"]).describe("Action to perform"),
  name: z.string().describe("Volume name"),
});

const ManageNetworkSchema = z.object({
  environment_id: z.number().describe("Portainer environment ID"),
  action: z.enum(["create", "remove"]).describe("Action to perform"),
  name: z.string().describe("Network name (for create) or ID (for remove)"),
  subnet: z.string().optional().describe("CIDR subnet for create (e.g., 172.20.0.0/16)"),
});

// Tool definitions
const tools = [
  {
    name: "list_environments",
    description: "List all Portainer environments (Docker endpoints)",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
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
      },
      required: ["environment_id", "name", "compose_content"],
    },
  },
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

// Helper to format responses
function formatResponse(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function formatError(error: unknown): { content: Array<{ type: "text"; text: string }>; isError: true } {
  const message = error instanceof PortainerClientError
    ? error.message
    : error instanceof Error
    ? error.message
    : "Unknown error";

  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

// Server setup
const server = new Server(
  { name: "portainer-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_environments": {
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

      case "list_containers": {
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

      case "inspect_container": {
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

      case "container_logs": {
        const parsed = ContainerLogsSchema.parse(args);
        const logs = await client.getContainerLogs(
          parsed.environment_id,
          parsed.container_id,
          parsed.tail
        );
        return formatResponse({ logs });
      }

      case "container_action": {
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

      case "list_stacks": {
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

      case "inspect_stack": {
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

      case "stack_action": {
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

      case "create_stack": {
        const parsed = CreateStackSchema.parse(args);
        const stack = await client.createStack(
          parsed.environment_id,
          parsed.name,
          parsed.compose_content
        );
        return formatResponse({
          success: true,
          id: stack.Id,
          name: stack.Name,
        });
      }

      case "list_images": {
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

      case "manage_image": {
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

      case "list_volumes": {
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

      case "manage_volume": {
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

      case "list_networks": {
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

      case "manage_network": {
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

      default:
        return formatError(new Error(`Unknown tool: ${name}`));
    }
  } catch (error) {
    return formatError(error);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Portainer MCP server started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: No errors, `dist/index.js` created

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: implement MCP server with all Portainer tools"
```

---

### Task 4: README Documentation

**Files:**
- Create: `README.md`

**Step 1: Write README**

Create `README.md`:
```markdown
# Portainer MCP Server

An MCP (Model Context Protocol) server that provides tools to interact with Portainer for Docker container management.

## Features

- **Environments**: List and inspect Portainer environments
- **Containers**: List, inspect, logs, start/stop/restart/kill/remove
- **Stacks**: List, inspect, create, start/stop/remove
- **Images**: List, pull, remove
- **Volumes**: List, create, remove
- **Networks**: List, create, remove

## Installation

```bash
pnpm install
pnpm build
```

## Configuration

Set these environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `PORTAINER_URL` | Yes | Portainer instance URL (e.g., `https://portainer.example.com`) |
| `PORTAINER_API_KEY` | Yes | Portainer API key |
| `PORTAINER_WRITE_ENABLED` | No | Set to `true` to enable write operations (default: `false`) |

### Getting a Portainer API Key

1. Log into Portainer
2. Go to **My Account** → **Access Tokens**
3. Click **Add access token**
4. Copy the generated token

## Usage with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "portainer": {
      "command": "node",
      "args": ["/path/to/portainer-mcp/dist/index.js"],
      "env": {
        "PORTAINER_URL": "https://portainer.example.com",
        "PORTAINER_API_KEY": "ptr_your_api_key_here"
      }
    }
  }
}
```

To enable write operations:

```json
{
  "mcpServers": {
    "portainer": {
      "command": "node",
      "args": ["/path/to/portainer-mcp/dist/index.js"],
      "env": {
        "PORTAINER_URL": "https://portainer.example.com",
        "PORTAINER_API_KEY": "ptr_your_api_key_here",
        "PORTAINER_WRITE_ENABLED": "true"
      }
    }
  }
}
```

## Available Tools

### Read-Only (Always Available)

| Tool | Description |
|------|-------------|
| `list_environments` | List all Portainer environments |
| `list_containers` | List containers in an environment |
| `inspect_container` | Get container details |
| `container_logs` | Get container logs |
| `list_stacks` | List all stacks |
| `inspect_stack` | Get stack details + compose file |
| `list_images` | List images |
| `list_volumes` | List volumes |
| `list_networks` | List networks |

### Write Operations (Require `PORTAINER_WRITE_ENABLED=true`)

| Tool | Description |
|------|-------------|
| `container_action` | Start, stop, restart, kill, or remove a container |
| `stack_action` | Start, stop, or remove a stack |
| `create_stack` | Create a new Docker Compose stack |
| `manage_image` | Pull or remove an image |
| `manage_volume` | Create or remove a volume |
| `manage_network` | Create or remove a network |

## Example Workflows

### Check what's running

1. `list_environments` → Get environment IDs
2. `list_containers(environment_id=1)` → See containers
3. `container_logs(environment_id=1, container_id="abc123")` → View logs

### Deploy a stack

```
create_stack(
  environment_id=1,
  name="my-app",
  compose_content="version: '3'\nservices:\n  web:\n    image: nginx"
)
```

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with usage instructions"
```

---

### Task 5: Final Verification

**Step 1: Clean build**

Run: `rm -rf dist && pnpm build`
Expected: Clean build with no errors

**Step 2: Verify structure**

Run: `ls -la dist/`
Expected: `index.js`, `client.js`, `types.js`, and declaration files

**Step 3: Test startup (dry run)**

Run: `PORTAINER_URL=http://test PORTAINER_API_KEY=test node dist/index.js &; sleep 1; kill %1 2>/dev/null || true`
Expected: Server starts without crash, prints "Portainer MCP server started"

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: finalize project structure" --allow-empty
```

---

## Summary

**Total Tasks:** 5
**Files Created:**
- `package.json` - Project configuration
- `tsconfig.json` - TypeScript configuration
- `src/types.ts` - Type definitions
- `src/client.ts` - Portainer API client
- `src/index.ts` - MCP server entry point
- `README.md` - Documentation

**Tools Implemented:** 15 (9 read-only, 6 write)
