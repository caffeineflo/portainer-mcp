import { PortainerClientError } from "../client.js";

export type ToolResponse = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export function formatResponse(data: unknown): ToolResponse {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function formatError(error: unknown): ToolResponse {
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
