import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from '../src/index.js';
import { createServer } from '../src/mcp/server.js';
import { setTaxonomyCacheForTesting } from '../src/ebird/helpers.js';

describe('MCP server and worker handler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setTaxonomyCacheForTesting([
      {
        speciesCode: 'snoowl1',
        comName: 'Snowy Owl',
        sciName: 'Bubo scandiacus',
        category: 'species',
      },
    ]);
  });

  afterEach(() => {
    setTaxonomyCacheForTesting(null);
    vi.restoreAllMocks();
  });

  it('creates an McpServer instance with registered tools, resources, and prompts', () => {
    const server = createServer();
    expect(server).toBeDefined();
  });

  it('handles GET /health and returns 200 with CORS headers', async () => {
    const response = await worker.fetch(new Request('http://localhost/health'));
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    const body = (await response.json()) as { name: string; status: string };
    expect(body).toEqual({ name: 'ebird-mcp', status: 'ok' });
  });

  it('handles GET / as a root health check', async () => {
    const response = await worker.fetch(new Request('http://localhost/'));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { name: string; status: string };
    expect(body.status).toBe('ok');
  });

  it('handles OPTIONS /mcp for CORS preflight', async () => {
    const response = await worker.fetch(new Request('http://localhost/mcp', { method: 'OPTIONS' }));
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
  });

  it('returns 404 for unknown endpoints', async () => {
    const response = await worker.fetch(new Request('http://localhost/unknown'));
    expect(response.status).toBe(404);
  });

  it('returns 405 for unsupported HTTP methods', async () => {
    const response = await worker.fetch(new Request('http://localhost/mcp', { method: 'PUT' }));
    expect(response.status).toBe(405);
  });

  async function postMcp(bodyObj: Record<string, unknown>) {
    return worker.fetch(
      new Request('http://localhost/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify(bodyObj),
      }),
    );
  }

  it('handles MCP initialize request over HTTP POST', async () => {
    const response = await postMcp({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      jsonrpc: string;
      id: number;
      result: {
        serverInfo: { name: string; version: string };
        capabilities: { tools?: unknown; resources?: unknown; prompts?: unknown };
      };
    };
    expect(data.jsonrpc).toBe('2.0');
    expect(data.id).toBe(1);
    expect(data.result.serverInfo.name).toBe('ebird-mcp');
    expect(data.result.capabilities.tools).toBeDefined();
    expect(data.result.capabilities.resources).toBeDefined();
    expect(data.result.capabilities.prompts).toBeDefined();
  });

  it('lists all 28 tools including AI helper tools', async () => {
    const response = await postMcp({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      result: { tools: Array<{ name: string; description?: string }> };
    };

    expect(data.result.tools.length).toBe(28);

    const toolNames = data.result.tools.map((t) => t.name);
    expect(toolNames).toContain('ebird_search_species');
    expect(toolNames).toContain('ebird_search_hotspots');
    expect(toolNames).toContain('ebird_lookup_region');
    expect(toolNames).toContain('ebird_data_obs_recent');
    expect(toolNames).toContain('ebird_ref_taxonomy');
  });

  it('executes ebird_search_species tool through MCP protocol', async () => {
    const response = await postMcp({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'ebird_search_species',
        arguments: {
          query: 'Snowy Owl',
        },
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      result: { content: Array<{ type: string; text: string }> };
    };
    expect(data.result.content[0].type).toBe('text');
    const parsed = JSON.parse(data.result.content[0].text);
    expect(parsed.length).toBe(1);
    expect(parsed[0].speciesCode).toBe('snoowl1');
  });

  it('lists registered MCP resources', async () => {
    const response = await postMcp({
      jsonrpc: '2.0',
      id: 4,
      method: 'resources/list',
      params: {},
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      result: { resources: Array<{ uri: string; name: string }> };
    };

    const uris = data.result.resources.map((r) => r.uri);
    expect(uris).toContain('ebird://server-info');
    expect(uris).toContain('ebird://taxonomy/versions');
    expect(uris).toContain('ebird://locales');
  });

  it('reads ebird://server-info resource', async () => {
    const response = await postMcp({
      jsonrpc: '2.0',
      id: 5,
      method: 'resources/read',
      params: {
        uri: 'ebird://server-info',
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      result: { contents: Array<{ uri: string; text: string; mimeType: string }> };
    };
    expect(data.result.contents[0].uri).toBe('ebird://server-info');
    const parsed = JSON.parse(data.result.contents[0].text);
    expect(parsed.name).toBe('ebird-mcp');
    expect(parsed.toolsCount).toBe(28);
  });

  it('lists registered MCP prompts', async () => {
    const response = await postMcp({
      jsonrpc: '2.0',
      id: 6,
      method: 'prompts/list',
      params: {},
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      result: { prompts: Array<{ name: string; description: string }> };
    };

    const promptNames = data.result.prompts.map((p) => p.name);
    expect(promptNames).toContain('find-rare-birds');
    expect(promptNames).toContain('plan-birding-trip');
    expect(promptNames).toContain('species-tracker');
  });

  it('gets a prompt template by name', async () => {
    const response = await postMcp({
      jsonrpc: '2.0',
      id: 7,
      method: 'prompts/get',
      params: {
        name: 'find-rare-birds',
        arguments: {
          regionCode: 'US-NY',
        },
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      result: { messages: Array<{ role: string; content: { text: string } }> };
    };
    expect(data.result.messages[0].content.text).toContain('US-NY');
    expect(data.result.messages[0].content.text).toContain('ebird_data_obs_recent_notable');
  });
});
