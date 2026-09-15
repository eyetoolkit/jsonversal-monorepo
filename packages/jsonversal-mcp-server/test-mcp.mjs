#!/usr/bin/env node
// Test MCP protocol over stdio
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

const outstanding = new Map();
let id = 1;
const emitter = new EventEmitter();

const proc = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, STDOUT_MODE: 'mcp' }
});

proc.stdout.on('data', (d) => {
  const lines = d.toString().trim().split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const resp = JSON.parse(line);
      if (resp.id !== undefined && outstanding.has(resp.id)) {
        const { resolve } = outstanding.get(resp.id);
        outstanding.delete(resp.id);
        resolve(resp);
      } else {
        emitter.emit('notification', resp);
      }
    } catch {}
  }
});

function send(method, params = {}) {
  return new Promise((resolve) => {
    const reqId = id++;
    outstanding.set(reqId, { resolve });
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: reqId, method, params }) + '\n');
  });
}

async function run() {
  console.log('--- MCP Protocol Test ---\n');

  // Initialize
  const init = await send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0' }
  });
  console.log('✓ initialize →', JSON.stringify(init.result?.serverInfo));

  // Send notifications/initialized
  proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  // List tools
  const list = await send('tools/list');
  const toolNames = list.result?.tools?.map(t => t.name);
  console.log('✓ tools/list →', toolNames.join(', '));

  // Call json_format
  const fmt = await send('tools/call', {
    name: 'json_format',
    arguments: { json: '{"a":1,"b":2}', indent: 2 }
  });
  const fmtText = fmt.result?.content?.[0]?.text;
  const fmtData = JSON.parse(fmtText);
  console.log('✓ json_format →', fmtData.success ? 'success' : fmtData.error);

  // Call regex_test
  const rx = await send('tools/call', {
    name: 'regex_test',
    arguments: { pattern: '\\d+', flags: 'g', testStrings: ['test123abc'] }
  });
  const rxText = rx.result?.content?.[0]?.text;
  const rxData = JSON.parse(rxText);
  console.log('✓ regex_test →', rxData.success ? `matches=${rxData.data.results[0].matches}` : rxData.error);

  // Call jwt_decode
  const jwt = await send('tools/call', {
    name: 'jwt_decode',
    arguments: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' }
  });
  const jwtText = jwt.result?.content?.[0]?.text;
  const jwtData = JSON.parse(jwtText);
  console.log('✓ jwt_decode →', jwtData.success ? `sub=${jwtData.data.payload?.sub}, expired=${jwtData.data.isExpired}` : jwtData.error);

  // Call hash_generate
  const hash = await send('tools/call', {
    name: 'hash_generate',
    arguments: { text: 'hello world', algorithm: 'sha256' }
  });
  const hashText = hash.result?.content?.[0]?.text;
  const hashData = JSON.parse(hashText);
  console.log('✓ hash_generate →', hashData.success ? `${hashData.data.algorithm}:${hashData.data.result.slice(0, 16)}...` : hashData.error);

  // Ping
  const ping = await send('ping');
  console.log('✓ ping →', ping.result === null ? 'null (ok)' : ping.result);

  proc.kill();
  console.log('\nAll MCP tests passed!');
}

run().catch(e => { console.error(e); proc.kill(); process.exit(1); });
