import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callEbirdEndpoint, buildEndpointUrl, toolDefinitions } from '../src/ebird/client.js';

const fakeResponseBody = JSON.stringify({ ok: true });

function makeMockFetch() {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    return new Response(fakeResponseBody, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  // @ts-expect-error - global is not strictly typed in this environment
  global.fetch = fn;
  return { fn, calls };
}

describe('client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a tool registry with apiKey field for all auth-required tools', () => {
    const authTools = toolDefinitions().filter((t) => 'apiKey' in t.inputSchema);
    const nonAuthTools = toolDefinitions().filter((t) => !('apiKey' in t.inputSchema));

    expect(authTools.length + nonAuthTools.length).toBe(25);
    expect(authTools.length).toBe(22); // currently 22 tools require api key
    expect(nonAuthTools.length).toBe(3);
  });

  it('constructs encoded URL and forwards known query params', async () => {
    const { fn, calls } = makeMockFetch();

    await callEbirdEndpoint('data_obs_recent', {
      apiKey: 'abc',
      regionCode: 'US-NY',
      back: 7,
      maxResults: 20,
      includeProvisional: false,
      unknown: 'ignore-me',
    } as any);

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
      'User-Agent': 'ebird-mcp/1.0',
    });
    expect(url.searchParams.has('apiKey')).toBe(false);
  });

  it('requires apiKey for authenticated calls', async () => {
    await expect(
      callEbirdEndpoint('product_top100', {
        regionCode: 'US',
        y: 2026,
        m: 8,
        d: 19,
      } as any),
    ).rejects.toBeTruthy();
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
});
