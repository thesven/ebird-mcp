import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestJson, EbirdRequestError } from '../src/utils/fetch.js';

describe('requestJson utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully fetches and parses JSON response', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ result: 'success' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const result = await requestJson('https://api.ebird.org/v2/ref/taxonomy/ebird');
    expect(result).toEqual({ result: 'success' });
  });

  it('returns raw text when responseType is text', async () => {
    global.fetch = vi.fn(async () => {
      return new Response('col1,col2\nval1,val2', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      });
    });

    const result = await requestJson(
      'https://api.ebird.org/v2/ref/taxonomy/ebird',
      {},
      { responseType: 'text' },
    );
    expect(result).toBe('col1,col2\nval1,val2');
  });

  it('throws EbirdRequestError when response is not ok', async () => {
    global.fetch = vi.fn(async () => {
      return new Response('Invalid API key', {
        status: 403,
        statusText: 'Forbidden',
      });
    });

    await expect(requestJson('https://api.ebird.org/v2/data/obs/US/recent')).rejects.toThrow(
      EbirdRequestError,
    );
  });

  it('throws EbirdRequestError when JSON parsing fails', async () => {
    global.fetch = vi.fn(async () => {
      return new Response('not valid json', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    await expect(requestJson('https://api.ebird.org/v2/ref/taxonomy/ebird')).rejects.toThrow(
      'Invalid JSON response from eBird API',
    );
  });
});
