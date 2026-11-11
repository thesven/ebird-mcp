import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './mcp/server.js';

export function tryLoadKeyFromFile(filePath: string): string | undefined {
  try {
    if (!fs.existsSync(filePath)) return undefined;
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(
      /^\s*(?:export\s+)?(?:EBIRD_API_KEY|EBIRD_API_TOKEN)\s*=\s*(["']?)([^"'\r\n]+)\1\s*$/m,
    );
    return match ? match[2].trim() : undefined;
  } catch {
    return undefined;
  }
}

export interface InitApiKeyOptions {
  cwd?: string;
  homedir?: string;
  silent?: boolean;
}

export function initializeApiKey(options: InitApiKeyOptions = {}): string | undefined {
  if (process.env.EBIRD_API_KEY && process.env.EBIRD_API_KEY.trim()) {
    return process.env.EBIRD_API_KEY.trim();
  }

  if (process.env.EBIRD_API_TOKEN && process.env.EBIRD_API_TOKEN.trim()) {
    process.env.EBIRD_API_KEY = process.env.EBIRD_API_TOKEN.trim();
    return process.env.EBIRD_API_KEY;
  }

  const homedir = options.homedir ?? os.homedir();
  const cwd = options.cwd ?? process.cwd();

  const candidateFiles = [
    path.join(cwd, '.env'),
    path.join(homedir, '.zshrc'),
    path.join(homedir, '.bashrc'),
    path.join(homedir, '.bash_profile'),
    path.join(homedir, '.profile'),
    path.join(homedir, '.config', 'ebird', 'key'),
  ];

  for (const candidate of candidateFiles) {
    const key = tryLoadKeyFromFile(candidate);
    if (key) {
      process.env.EBIRD_API_KEY = key;
      if (!options.silent) {
        process.stderr.write(`[ebird-mcp] Loaded EBIRD_API_KEY from ${candidate}\n`);
      }
      return key;
    }
  }

  if (!options.silent) {
    process.stderr.write(
      '[ebird-mcp] Notice: EBIRD_API_KEY is not set. Tools requiring authentication will require an apiKey argument. Get a free key at https://ebird.org/api/keygen\n',
    );
  }

  return undefined;
}

export async function runStdioServer(): Promise<void> {
  initializeApiKey();

  const server = createServer();
  const transport = new StdioServerTransport();

  const shutdown = async () => {
    try {
      await server.close();
    } catch {}
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await server.connect(transport);
}

// Automatically start if executed as entrypoint
const isDirectEntry =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('bin/ebird-mcp.js') ||
  process.argv[1]?.endsWith('ebird-mcp-stdio.mjs');

if (isDirectEntry) {
  runStdioServer().catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    process.stderr.write(`[ebird-mcp] Fatal error: ${message}\n`);
    process.exit(1);
  });
}
