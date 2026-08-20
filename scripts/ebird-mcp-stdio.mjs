import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from '../dist/src/mcp/server.js';

function loadEbirdKeyFromZshrc() {
  if (process.env.EBIRD_API_KEY && process.env.EBIRD_API_KEY.trim()) {
    return process.env.EBIRD_API_KEY.trim();
  }

  const zshrcPath = path.join(os.homedir(), '.zshrc');
  const content = fs.readFileSync(zshrcPath, 'utf8');
  const match = content.match(/^\s*export\s+EBIRD_API_KEY\s*=\s*(["']?)([^"'\r\n]+)\1\s*$/m);
  if (!match) {
    throw new Error(`EBIRD_API_KEY not found in ${zshrcPath}`);
  }

  return match[2].trim();
}

async function main() {
  process.env.EBIRD_API_KEY = loadEbirdKeyFromZshrc();
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});