import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './mcp/server.js';

function tryLoadKeyFromFile(filePath: string): string | undefined {
  try {
    if (!fs.existsSync(filePath)) return undefined;
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/^\s*(?:export\s+)?EBIRD_API_KEY\s*=\s*(["']?)([^"'\r\n]+)\1\s*$/m);
    return match ? match[2].trim() : undefined;
  } catch {
    return undefined;
  }
}

function initializeApiKey(): void {
  if (process.env.EBIRD_API_KEY && process.env.EBIRD_API_KEY.trim()) {
    return;
  }

  const homedir = os.homedir();
  const candidateFiles = [
    path.join(process.cwd(), '.env'),
    path.join(homedir, '.zshrc'),
    path.join(homedir, '.bashrc'),
    path.join(homedir, '.config', 'ebird', 'key'),
  ];

  for (const candidate of candidateFiles) {
    const key = tryLoadKeyFromFile(candidate);
    if (key) {
      process.env.EBIRD_API_KEY = key;
      process.stderr.write(`[ebird-mcp] Loaded EBIRD_API_KEY from ${candidate}\n`);
      return;
    }
  }

  process.stderr.write(
    '[ebird-mcp] Notice: EBIRD_API_KEY is not set. Tools requiring authentication will require an apiKey argument. Get a free key at https://ebird.org/api/keygen\n',
  );
}

async function main(): Promise<void> {
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

void main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`[ebird-mcp] Fatal error: ${message}\n`);
  process.exit(1);
});
