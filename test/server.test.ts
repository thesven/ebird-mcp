import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from '../src/index.js';
import { createServer } from '../src/mcp/server.js';
import { setTaxonomyCacheForTesting } from '../src/ebird/helpers.js';

describe('MCP server and worker handler', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.EBIRD_API_KEY;
    delete process.env.EBIRD_API_TOKEN;
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
    process.env = { ...originalEnv };
  });

  it('creates an McpServer instance with registered tools, resources, and prompts', () => {
    const server = createServer();
    expect(server).toBeDefined();
  });

  it('supports custom server name and version options', () => {
    const server = createServer({ name: 'custom-ebird', version: '2.5.0' });
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

  it('executes ebird_search_hotspots tool through MCP protocol', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify([
          {
            locId: 'L12345',
            locName: 'Central Park',
            lat: 40.785,
            lng: -73.968,
            numSpeciesAllTime: 290,
          },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });

    const response = await postMcp({
      jsonrpc: '2.0',
      id: 31,
      method: 'tools/call',
      params: {
        name: 'ebird_search_hotspots',
        arguments: {
          regionCode: 'US-NY',
          query: 'Central',
          apiKey: 'test-api-key',
        },
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      result: { content: Array<{ type: string; text: string }> };
    };
    const parsed = JSON.parse(data.result.content[0].text);
    expect(parsed[0].locName).toBe('Central Park');
  });

  it('executes ebird_lookup_region tool through MCP protocol', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify([
          { code: 'US-NY-061', name: 'New York County' },
          { code: 'US-NY-047', name: 'Kings County' },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });

    const response = await postMcp({
      jsonrpc: '2.0',
      id: 32,
      method: 'tools/call',
      params: {
        name: 'ebird_lookup_region',
        arguments: {
          regionType: 'subnational2',
          parentRegionCode: 'US-NY',
          query: 'Kings',
          apiKey: 'test-api-key',
        },
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      result: { content: Array<{ type: string; text: string }> };
    };
    const parsed = JSON.parse(data.result.content[0].text);
    expect(parsed.length).toBe(1);
    expect(parsed[0].code).toBe('US-NY-047');
  });

  it('executes core ebird_data_obs_recent tool through MCP protocol with apiKey', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify([
          {
            speciesCode: 'cangoo',
            comName: 'Canada Goose',
            sciName: 'Branta canadensis',
            locName: 'Jamaica Bay Wildlife Refuge',
            howMany: 42,
          },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });

    const response = await postMcp({
      jsonrpc: '2.0',
      id: 33,
      method: 'tools/call',
      params: {
        name: 'ebird_data_obs_recent',
        arguments: {
          regionCode: 'US-NY',
          apiKey: 'test-api-key',
        },
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      result: { content: Array<{ type: string; text: string }> };
    };
    const parsed = JSON.parse(data.result.content[0].text);
    expect(parsed[0].speciesCode).toBe('cangoo');
  });

  it('returns isError: true when protected tool is called without an API key', async () => {
    const response = await postMcp({
      jsonrpc: '2.0',
      id: 34,
      method: 'tools/call',
      params: {
        name: 'ebird_data_obs_recent',
        arguments: {
          regionCode: 'US-NY',
        },
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      result: { isError: boolean; content: Array<{ type: string; text: string }> };
    };
    expect(data.result.isError).toBe(true);
    expect(data.result.content[0].text).toContain('eBird API key is required');
  });

  it('returns isError: true when helper tool encounters invalid arguments', async () => {
    const response = await postMcp({
      jsonrpc: '2.0',
      id: 35,
      method: 'tools/call',
      params: {
        name: 'ebird_search_hotspots',
        arguments: {},
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      result: { isError: boolean; content: Array<{ type: string; text: string }> };
    };
    expect(data.result.isError).toBe(true);
    expect(data.result.content[0].text).toContain('Either');
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

  it('reads ebird://taxonomy/versions resource', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(JSON.stringify([{ version: '2024', releaseDate: '2024-10-25' }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const response = await postMcp({
      jsonrpc: '2.0',
      id: 51,
      method: 'resources/read',
      params: {
        uri: 'ebird://taxonomy/versions',
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      result: { contents: Array<{ uri: string; text: string; mimeType: string }> };
    };
    expect(data.result.contents[0].uri).toBe('ebird://taxonomy/versions');
    const parsed = JSON.parse(data.result.contents[0].text);
    expect(parsed[0].version).toBe('2024');
  });

  it('reads ebird://locales resource', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(JSON.stringify([{ code: 'en', name: 'English' }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    process.env.EBIRD_API_KEY = 'test-locale-token';
    const response = await postMcp({
      jsonrpc: '2.0',
      id: 52,
      method: 'resources/read',
      params: {
        uri: 'ebird://locales',
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      result: { contents: Array<{ uri: string; text: string; mimeType: string }> };
    };
    expect(data.result.contents[0].uri).toBe('ebird://locales');
    const parsed = JSON.parse(data.result.contents[0].text);
    expect(parsed[0].code).toBe('en');
  });

  it('handles resource read failure gracefully', async () => {
    global.fetch = vi.fn(async () => {
      return new Response('Internal error', {
        status: 500,
        statusText: 'Internal Server Error',
      });
    });

    const response = await postMcp({
      jsonrpc: '2.0',
      id: 53,
      method: 'resources/read',
      params: {
        uri: 'ebird://locales',
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      result: { contents: Array<{ uri: string; text: string }> };
    };
    const parsed = JSON.parse(data.result.contents[0].text);
    expect(parsed.error).toBeDefined();
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

  it('gets a find-rare-birds prompt template', async () => {
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

  it('gets a plan-birding-trip prompt template', async () => {
    const response = await postMcp({
      jsonrpc: '2.0',
      id: 71,
      method: 'prompts/get',
      params: {
        name: 'plan-birding-trip',
        arguments: {
          location: 'Central Park, NY',
          duration: 'weekend',
        },
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      result: { messages: Array<{ role: string; content: { text: string } }> };
    };
    expect(data.result.messages[0].content.text).toContain('Central Park, NY');
    expect(data.result.messages[0].content.text).toContain('weekend');
  });

  it('gets a species-tracker prompt template', async () => {
    const response = await postMcp({
      jsonrpc: '2.0',
      id: 72,
      method: 'prompts/get',
      params: {
        name: 'species-tracker',
        arguments: {
          species: 'Snowy Owl',
          regionCode: 'US-MA',
        },
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      result: { messages: Array<{ role: string; content: { text: string } }> };
    };
    expect(data.result.messages[0].content.text).toContain('Snowy Owl');
    expect(data.result.messages[0].content.text).toContain('US-MA');
  });
});
