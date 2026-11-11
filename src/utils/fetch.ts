export interface EbirdRequestErrorInfo {
  status: number;
  statusText: string;
  endpoint: string;
  body?: string;
}

export class EbirdRequestError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly endpoint: string;
  public readonly body?: string;

  constructor(message: string, info: EbirdRequestErrorInfo) {
    super(message);
    this.name = 'EbirdRequestError';
    this.status = info.status;
    this.statusText = info.statusText;
    this.endpoint = info.endpoint;
    this.body = info.body;
  }
}

export interface FetchOptions {
  timeoutMs?: number;
  headers?: HeadersInit;
  responseType?: 'json' | 'text';
}

async function readResponseBodyText(resp: Response): Promise<string | undefined> {
  try {
    const text = await resp.text();
    return text || undefined;
  } catch {
    return undefined;
  }
}

export async function requestJson(
  url: string,
  init: RequestInit = {},
  options: FetchOptions = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 15000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      ...init,
      headers: {
        Accept: options.responseType === 'text' ? 'text/plain' : 'application/json',
        ...options.headers,
        ...init.headers,
      },
    });

    if (!resp.ok) {
      const body = await readResponseBodyText(resp);
      throw new EbirdRequestError(
        `eBird API request failed with ${resp.status} ${resp.statusText}`,
        {
          status: resp.status,
          statusText: resp.statusText,
          endpoint: url,
          body,
        },
      );
    }

    const bodyText = await resp.text();

    if (options.responseType === 'text') {
      return bodyText;
    }

    try {
      return JSON.parse(bodyText);
    } catch {
      throw new EbirdRequestError('Invalid JSON response from eBird API', {
        status: resp.status,
        statusText: resp.statusText,
        endpoint: url,
        body: bodyText || undefined,
      });
    }
  } finally {
    clearTimeout(timeout);
  }
}
