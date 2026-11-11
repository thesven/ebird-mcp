import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createServer } from './mcp/server.js';

const allowedOrigin = '*';

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    'content-type, mcp-session-id, last-event-id, authorization',
  );
  headers.set('Access-Control-Allow-Credentials', 'false');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleMcpRequest(request: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  const server = createServer();
  await server.connect(transport);

  try {
    return withCors(await transport.handleRequest(request));
  } finally {
    request.signal.addEventListener('abort', () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });
    transport.close().catch(() => {});
    server.close().catch(() => {});
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health' || url.pathname === '/') {
      return withCors(
        new Response(JSON.stringify({ name: 'ebird-mcp', status: 'ok' }), {
          headers: { 'content-type': 'application/json' },
        }),
      );
    }

    if (url.pathname !== '/mcp') {
      return withCors(new Response('Not found', { status: 404 }));
    }

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    if (!['GET', 'POST', 'DELETE'].includes(request.method)) {
      return withCors(new Response('Method not allowed', { status: 405 }));
    }

    return handleMcpRequest(request);
  },
};
