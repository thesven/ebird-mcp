import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { tryLoadKeyFromFile, initializeApiKey, runStdioServer } from '../src/stdio.js';

describe('stdio environment and dotfile key loader', () => {
  const originalEnv = { ...process.env };
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ebird-stdio-test-'));
    delete process.env.EBIRD_API_KEY;
    delete process.env.EBIRD_API_TOKEN;
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('parses key with quotes and export prefix', () => {
    const envFile = path.join(tempDir, '.env');
    fs.writeFileSync(envFile, 'export EBIRD_API_KEY="test-api-token-123"\n');
    expect(tryLoadKeyFromFile(envFile)).toBe('test-api-token-123');
  });

  it('parses key with single quotes and no export', () => {
    const envFile = path.join(tempDir, '.env');
    fs.writeFileSync(envFile, "EBIRD_API_KEY='single-quote-token'\n");
    expect(tryLoadKeyFromFile(envFile)).toBe('single-quote-token');
  });

  it('parses EBIRD_API_TOKEN alias', () => {
    const envFile = path.join(tempDir, '.env');
    fs.writeFileSync(envFile, 'EBIRD_API_TOKEN=alias-token-xyz\n');
    expect(tryLoadKeyFromFile(envFile)).toBe('alias-token-xyz');
  });

  it('returns undefined if file does not exist', () => {
    expect(tryLoadKeyFromFile(path.join(tempDir, 'nonexistent'))).toBeUndefined();
  });

  it('returns undefined if file does not contain key', () => {
    const envFile = path.join(tempDir, '.env');
    fs.writeFileSync(envFile, 'OTHER_VAR=something_else\n');
    expect(tryLoadKeyFromFile(envFile)).toBeUndefined();
  });

  it('handles filesystem errors gracefully', () => {
    vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
      throw new Error('Permission denied');
    });
    const envFile = path.join(tempDir, '.env');
    fs.writeFileSync(envFile, 'EBIRD_API_KEY=secret\n');
    expect(tryLoadKeyFromFile(envFile)).toBeUndefined();
  });

  it('uses process.env.EBIRD_API_KEY if already set', () => {
    process.env.EBIRD_API_KEY = 'existing-env-key';
    const key = initializeApiKey({ cwd: tempDir, homedir: tempDir, silent: true });
    expect(key).toBe('existing-env-key');
  });

  it('uses process.env.EBIRD_API_TOKEN if EBIRD_API_KEY is not set', () => {
    process.env.EBIRD_API_TOKEN = 'fallback-token-env';
    const key = initializeApiKey({ cwd: tempDir, homedir: tempDir, silent: true });
    expect(key).toBe('fallback-token-env');
    expect(process.env.EBIRD_API_KEY).toBe('fallback-token-env');
  });

  it('loads key from cwd .env when env vars are absent', () => {
    const envFile = path.join(tempDir, '.env');
    fs.writeFileSync(envFile, 'EBIRD_API_KEY=cwd-env-key\n');
    const key = initializeApiKey({
      cwd: tempDir,
      homedir: path.join(tempDir, 'home'),
      silent: true,
    });
    expect(key).toBe('cwd-env-key');
  });

  it('loads key from homedir .zshrc when cwd has no .env', () => {
    const homeDir = path.join(tempDir, 'home');
    fs.mkdirSync(homeDir, { recursive: true });
    fs.writeFileSync(path.join(homeDir, '.zshrc'), 'export EBIRD_API_KEY="zshrc-token"\n');

    const key = initializeApiKey({ cwd: tempDir, homedir: homeDir, silent: false });
    expect(key).toBe('zshrc-token');
  });

  it('returns undefined and logs notice if no key is found anywhere', () => {
    const emptyHome = path.join(tempDir, 'empty-home');
    fs.mkdirSync(emptyHome, { recursive: true });
    const key = initializeApiKey({ cwd: tempDir, homedir: emptyHome, silent: false });
    expect(key).toBeUndefined();
  });

  it('initializes stdio server transport and connects server', async () => {
    let connectCalled = false;
    vi.spyOn(StdioServerTransport.prototype, 'start').mockImplementation(async () => {
      connectCalled = true;
    });

    await runStdioServer();
    expect(connectCalled).toBe(true);
  });

  it('runs bin/ebird-mcp.js CLI executable and responds to initialize over stdio', async () => {
    const { spawn } = await import('node:child_process');
    const binPath = path.resolve(__dirname, '../bin/ebird-mcp.js');
    const child = spawn(process.execPath, [binPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, EBIRD_API_KEY: 'test-token' },
    });

    const initMsg =
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'cli-test', version: '1.0' },
        },
      }) + '\n';

    let stdoutData = '';
    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stdin.write(initMsg);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error(`Timed out waiting for CLI response. Got: ${stdoutData}`));
      }, 3000);

      const interval = setInterval(() => {
        if (stdoutData.includes('"result"')) {
          clearTimeout(timeout);
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });

    child.kill('SIGTERM');
    const parsed = JSON.parse(stdoutData.trim());
    expect(parsed.result.serverInfo.name).toBe('ebird-mcp');
    expect(parsed.result.protocolVersion).toBe('2024-11-05');
  });
});
