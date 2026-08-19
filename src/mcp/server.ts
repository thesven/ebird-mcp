import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { callEbirdEndpoint, endpointByName, toolDefinitions } from '../ebird/client.js';

export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: 'ebird-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  for (const tool of toolDefinitions()) {
    const inputObject = z.object(tool.inputSchema as z.ZodRawShape);

    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: inputObject,
      },
      async (rawArgs: z.infer<typeof inputObject>) => {
        const endpointName = tool.name.replace(/^ebird_/, '');
        const def = endpointByName[endpointName];
        if (!def) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Unknown tool: ${tool.name}` }],
          };
        }

        try {
          const data = await callEbirdEndpoint(endpointName, rawArgs as Record<string, unknown>);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: message,
              },
            ],
          };
        }
      },
    );
  }

  return server;
}
