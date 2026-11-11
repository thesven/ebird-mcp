import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from '../src/index.js';
import { createServer } from '../src/mcp/server.js';

describe('MCP server and worker handler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an McpServer instance with registered tools', () => {
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

  it('handles MCP initialize request over HTTP POST', async () => {
    const request = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }),
    });

    const response = await worker.fetch(request);
    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      jsonrpc: string;
      id: number;
      result: { serverInfo: { name: string } };
    };
    expect(data.jsonrpc).toBe('2.0');
    expect(data.id).toBe(1);
    expect(data.result.serverInfo.name).toBe('ebird-mcp');
  });
});
