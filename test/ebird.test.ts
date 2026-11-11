import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  toolDefinitions,
  buildEndpointUrl,
  callEbirdEndpoint,
  resolveApiKey,
  EBIRD_API_BASE,
  CLIENT_VERSION,
} from '../src/ebird/client.js';

function makeMockFetch() {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init || {} });
    return new Response(JSON.stringify([{ result: 'ok' }]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  global.fetch = fn as unknown as typeof fetch;
  return { fn, calls };
}

function makeMockFetchText(text: string) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init || {} });
    return new Response(text, {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });
  });
  global.fetch = fn as unknown as typeof fetch;
  return { fn, calls };
}

describe('client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.EBIRD_API_KEY;
    delete process.env.EBIRD_API_TOKEN;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports valid constants', () => {
    expect(EBIRD_API_BASE).toBe('https://api.ebird.org/v2');
    expect(CLIENT_VERSION).toBe('1.2.0');
  });

  it('builds a tool registry with apiKey field for all auth-required tools', () => {
    const list = toolDefinitions();
    expect(list.length).toBe(25);
    const protectedTool = list.find((t) => t.def.requiresApiKey);
    expect(protectedTool).toBeDefined();
    expect(protectedTool?.inputSchema).toHaveProperty('apiKey');
  });

  it('buildEndpointUrl applies defaults and encodes queries', () => {
    const { url, endpoint } = buildEndpointUrl('data_obs_recent', {
      regionCode: 'US-NY',
      apiKey: 'abc',
    });

    expect(endpoint).toBe('/data/obs/{regionCode}/recent');
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/v2/data/obs/US-NY/recent');
    expect(parsed.searchParams.get('back')).toBe('30');
  });

  it('constructs encoded URL and forwards known query params', async () => {
    const { fn, calls } = makeMockFetch();

    await callEbirdEndpoint('data_obs_recent', {
      regionCode: 'US-NY',
      back: 7,
      maxResults: 20,
      includeProvisional: false,
      unknown: 'value',
      apiKey: 'abc',
    });

    expect(fn).toHaveBeenCalledOnce();
    const req = calls[0];
    const url = new URL(req.url);

    expect(url.pathname).toBe('/v2/data/obs/US-NY/recent');
    expect(url.searchParams.get('back')).toBe('7');
    expect(url.searchParams.get('maxResults')).toBe('20');
    expect(url.searchParams.get('includeProvisional')).toBe('false');
    expect(url.searchParams.has('unknown')).toBe(false);
    expect(req.init.headers).toMatchObject({
      'x-ebirdapitoken': 'abc',
      'User-Agent': 'ebird-mcp/1.2.0',
    });
    expect(url.searchParams.has('apiKey')).toBe(false);
  });

  it('supports csv response mode when requested', async () => {
    const { fn } = makeMockFetchText('id,name\n1,Test');

    const result = await callEbirdEndpoint('ref_taxonomy', {
      locale: 'en',
      fmt: 'csv',
    });

    expect(fn).toHaveBeenCalledOnce();
    expect(result).toBe('id,name\n1,Test');
  });

  it('requires apiKey for authenticated calls when no env var is set', async () => {
    delete process.env.EBIRD_API_KEY;
    delete process.env.EBIRD_API_TOKEN;

    await expect(
      callEbirdEndpoint('data_obs_recent', {
        regionCode: 'US-NY',
      }),
    ).rejects.toThrow(/eBird API key is required/);
  });

  it('automatically falls back to EBIRD_API_KEY environment variable if apiKey arg is omitted', async () => {
    const { fn, calls } = makeMockFetch();
    process.env.EBIRD_API_KEY = 'env-secret-token';

    await callEbirdEndpoint('data_obs_recent', {
      regionCode: 'US-NY',
    });
    expect(fn).toHaveBeenCalledOnce();
    expect(calls[0].init.headers).toMatchObject({
      'x-ebirdapitoken': 'env-secret-token',
    });
  });

  it('automatically falls back to EBIRD_API_TOKEN if EBIRD_API_KEY is not set', async () => {
    const { fn, calls } = makeMockFetch();
    process.env.EBIRD_API_TOKEN = 'fallback-token-val';

    await callEbirdEndpoint('data_obs_recent', {
      regionCode: 'US-NY',
    });
    expect(fn).toHaveBeenCalledOnce();
    expect(calls[0].init.headers).toMatchObject({
      'x-ebirdapitoken': 'fallback-token-val',
    });
  });

  it('supports no-auth taxonomy endpoint without apiKey', async () => {
    const { fn } = makeMockFetch();
    await callEbirdEndpoint('ref_taxonomy', {
      locale: 'en',
      fmt: 'json',
    });
    expect(fn).toHaveBeenCalledOnce();
    const call = fn.mock.calls[0][0] as string;
    const calledUrl = new URL(call);
    expect(calledUrl.pathname).toBe('/v2/ref/taxonomy/ebird');
  });

  it('buildEndpointUrl validates unknown endpoint', () => {
    expect(() => buildEndpointUrl('not_a_tool', {})).toThrow(/Unknown endpoint/);
  });

  it('buildEndpointUrl throws on missing required path param', () => {
    expect(() => buildEndpointUrl('data_obs_recent', { apiKey: 'key' }, false)).toThrow(
      /Missing required path param/,
    );
  });

  it('callEbirdEndpoint throws on unknown endpoint', async () => {
    await expect(callEbirdEndpoint('not_a_tool', {})).rejects.toThrow(/Unknown endpoint/);
  });

  it('callEbirdEndpoint adds retry advice on 429 rate limit error', async () => {
    global.fetch = vi.fn(async () => {
      return new Response('Rate limit reached', {
        status: 429,
        statusText: 'Too Many Requests',
      });
    });

    await expect(
      callEbirdEndpoint('data_obs_recent', {
        regionCode: 'US-NY',
        apiKey: 'key',
      }),
    ).rejects.toThrow(/retry this request after a delay/);
  });

  it('resolveApiKey returns undefined when given whitespace or empty values', () => {
    expect(resolveApiKey('')).toBeUndefined();
    expect(resolveApiKey('   ')).toBeUndefined();
    expect(resolveApiKey(null)).toBeUndefined();
  });
});
