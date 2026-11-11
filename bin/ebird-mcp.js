#!/usr/bin/env node
import { runStdioServer } from '../dist/src/stdio.js';

runStdioServer().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`[ebird-mcp] Fatal error: ${message}\n`);
  process.exit(1);
});
