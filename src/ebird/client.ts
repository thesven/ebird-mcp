import { z } from 'zod';
import { requestJson, EbirdRequestError } from '../utils/fetch.js';
import { apiKeyField } from './schema.js';
import { ebirdEndpointDefinitions, endpointByName, EndpointDef } from './endpoints.js';

export interface BuildQueryResult {
  url: string;
  endpoint: string;
}

const EBF = 'https://api.ebird.org/v2';

function toQueryValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return String(value);
  }
  return String(value);
}

function isValidApiKey(apiKey?: string): apiKey is string {
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
}

function applyDefaults<T extends Record<string, unknown>>(
  def: EndpointDef,
  args: T,
): Record<string, unknown> {
  return {
    ...def.queryDefaults,
    ...args,
  };
}

export function buildEndpointUrl(
  name: string,
  args: Record<string, unknown>,
  validateSchema = true,
): BuildQueryResult {
  const def = endpointByName[name];
  if (!def) {
    throw new Error(`Unknown endpoint: ${name}`);
  }

  const schema = z.object({
    ...def.querySchema,
    ...(def.requiresApiKey ? apiKeyField : {}),
  });

  const parsed = validateSchema ? (schema.parse(args) as Record<string, unknown>) : args;
  const normalized = applyDefaults(def, parsed);

  if (def.requiresApiKey && !isValidApiKey(normalized.apiKey as string | undefined)) {
    throw new Error(`apiKey is required for ${name}`);
  }

  let path = def.pathTemplate;
  for (const param of def.pathParams) {
    const value = normalized[param];
    if (value === undefined) {
      throw new Error(`Missing required path param: ${param}`);
    }
    path = path.replace(`{${param}}`, encodeURIComponent(String(value)));
  }

  const endpointUrl = new URL(`${EBF}${path}`);

  for (const [rawKey, rawValue] of Object.entries(normalized)) {
    if (rawKey === 'apiKey') continue;
    if (def.pathParams.includes(rawKey)) continue;
    if (!(rawKey in def.querySchema)) continue;

    const queryValue = toQueryValue(rawValue);
    if (queryValue !== undefined) {
      endpointUrl.searchParams.set(rawKey, queryValue);
    }
  }

  return {
    endpoint: def.pathTemplate,
    url: endpointUrl.toString(),
  };
}

export async function callEbirdEndpoint(name: string, args: Record<string, unknown>): Promise<unknown> {
  const def = endpointByName[name];
  if (!def) {
    throw new Error(`Unknown endpoint: ${name}`);
  }

  const parsed = z
    .object({
      ...def.querySchema,
      ...(def.requiresApiKey ? apiKeyField : {}),
    })
    .parse(args) as Record<string, unknown>;

  const normalized = applyDefaults(def, parsed);
  const { url, endpoint } = buildEndpointUrl(name, normalized, false);

  const headers: HeadersInit = {
    'User-Agent': 'ebird-mcp/1.0',
  };
  if (def.requiresApiKey) {
    headers['x-ebirdapitoken'] = String(normalized.apiKey);
  }

  const wantsText = normalized.fmt === 'csv';

  try {
    return await requestJson(url, {
      method: 'GET',
      headers,
    }, {
      responseType: wantsText ? 'text' : 'json',
    });
  } catch (error) {
    if (error instanceof EbirdRequestError) {
      const retryText = error.status === 429 || error.status >= 500 ? ' You may retry this request after a delay.' : '';
      throw new Error(`eBird API error (${error.status} ${error.statusText}) on ${endpoint}: ${error.body ?? 'No body'}${retryText}`);
    }
    throw error;
  }
}

export function toolDefinitions(): Array<{
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  def: EndpointDef;
}> {
  return ebirdEndpointDefinitions.map((def) => ({
    name: `ebird_${def.name}`,
    title: def.title,
    description: def.description,
    inputSchema: {
      ...(def.requiresApiKey ? apiKeyField : {}),
      ...def.querySchema,
    },
    def,
  }));
}

export { endpointByName };