#!/usr/bin/env node
// jsonversal MCP Server — Native implementation, no SDK dependency
// MCP Protocol: JSON-RPC 2.0 over stdio

import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';

// ─── JSON Utilities ─────────────────────────────────────────

function safeStringify(obj, indent = 2) {
  try { return JSON.stringify(obj, null, indent); }
  catch { return null; }
}

function parseJSON(str) {
  try { return JSON.parse(str); }
  catch { return null; }
}

function getType(val) {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

// ─── Response Helpers ───────────────────────────────────────

function errResp(code, message) {
  return { error: { code, message } };
}

function okResp(data) {
  return { success: true, data };
}

// ─── Handlers ──────────────────────────────────────────────

export const handlers = {

  json_format(body) {
    const { json, indent = 2 } = body;
    if (json === undefined) return errResp('INVALID_INPUT', 'Missing "json" field');
    const parsed = parseJSON(typeof json === 'string' ? json : JSON.stringify(json));
    if (parsed === null && parsed !== 0) return errResp('PARSE_ERROR', 'Invalid JSON');
    const result = safeStringify(parsed, Math.min(Math.max(+indent, 0), 8));
    if (!result) return errResp('STRINGIFY_ERROR', 'Failed to stringify');
    return okResp({ result, inputSize: JSON.stringify(parsed).length, outputSize: result.length });
  },

  json_validate(body) {
    const { json, schema: schemaRaw } = body;
    if (json === undefined) return errResp('INVALID_INPUT', 'Missing "json" field');
    const parsed = parseJSON(typeof json === 'string' ? json : JSON.stringify(json));
    if (parsed === null && parsed !== 0) return okResp({ valid: false, error: 'Invalid JSON syntax', parseError: true });
    if (!schemaRaw) return okResp({ valid: true, errors: [], parseError: false });
    const schema = parseJSON(typeof schemaRaw === 'string' ? schemaRaw : JSON.stringify(schemaRaw));
    if (!schema) return errResp('INVALID_SCHEMA', 'Invalid JSON Schema');
    const errors = validateSchema(parsed, schema);
    return okResp({ valid: errors.length === 0, errors, parseError: false });
  },

  json_minify(body) {
    const { json } = body;
    if (json === undefined) return errResp('INVALID_INPUT', 'Missing "json" field');
    const parsed = parseJSON(typeof json === 'string' ? json : JSON.stringify(json));
    if (parsed === null && parsed !== 0) return errResp('PARSE_ERROR', 'Invalid JSON');
    const originalSize = JSON.stringify(parsed).length;
    const result = JSON.stringify(parsed);
    return okResp({ result, originalSize, minifiedSize: result.length, reductionPercent: Math.round((1 - result.length / originalSize) * 100) });
  },

  json_diff(body) {
    const { jsonA, jsonB, ignoreOrder = false } = body;
    if (jsonA === undefined || jsonB === undefined) return errResp('INVALID_INPUT', 'Missing "jsonA" or "jsonB" field');
    const a = parseJSON(typeof jsonA === 'string' ? jsonA : JSON.stringify(jsonA));
    const b = parseJSON(typeof jsonB === 'string' ? jsonB : JSON.stringify(jsonB));
    if ((a === null && a !== 0) || (b === null && b !== 0)) return errResp('PARSE_ERROR', 'Invalid JSON');
    const diff = computeDiff(a, b, ignoreOrder);
    return okResp({ equal: diff.length === 0, differences: diff });
  },

  json_to_zod(body) {
    const { json, name = 'MySchema' } = body;
    if (json === undefined) return errResp('INVALID_INPUT', 'Missing "json" field');
    const parsed = parseJSON(typeof json === 'string' ? json : JSON.stringify(json));
    if (parsed === null && parsed !== 0) return errResp('PARSE_ERROR', 'Invalid JSON');
    const schemaName = /^[A-Z][a-zA-Z0-9]*$/.test(name) ? name : 'MySchema';
    return okResp({ schema: `import { z } from 'zod';\n\nexport const ${schemaName}Schema = ${jsonToZod(parsed, schemaName)};` });
  },

  json_to_typescript(body) {
    const { json, name = 'MyType' } = body;
    if (json === undefined) return errResp('INVALID_INPUT', 'Missing "json" field');
    const parsed = parseJSON(typeof json === 'string' ? json : JSON.stringify(json));
    if (parsed === null && parsed !== 0) return errResp('PARSE_ERROR', 'Invalid JSON');
    const typeName = /^[A-Z][a-zA-Z0-9]*$/.test(name) ? name : 'MyType';
    return okResp({ typeDefinition: `export type ${typeName} = ${jsonToTS(parsed, typeName)};` });
  },

  json_token_count(body) {
    const { text, model = 'gpt-4o' } = body;
    if (!text || typeof text !== 'string') return errResp('INVALID_INPUT', 'Missing "text" field');
    const m = model.toLowerCase();
    const cpt = m.includes('claude') ? 3.5 : m.includes('gemini') ? 4 : 4;
    const tokens = Math.ceil(text.length / cpt);
    return okResp({ tokens, estimatedModel: model, charsPerToken: cpt, charCount: text.length, wordCount: text.trim().split(/\s+/).length });
  },

  regex_test(body) {
    const { pattern, flags = '', testStrings = [''] } = body;
    if (!pattern || typeof pattern !== 'string') return errResp('INVALID_INPUT', 'Missing "pattern" field');
    let regex;
    try { regex = new RegExp(pattern, flags); }
    catch (e) { return errResp('INVALID_REGEX', `Invalid regex: ${e.message}`); }
    const strings = Array.isArray(testStrings) ? testStrings : [testStrings];
    const results = strings.map(s => ({
      input: s,
      matches: s.length > 0 ? regex.test(s) : false,
      captures: s.length > 0 ? s.match(regex) : null,
    }));
    let groupNames = [];
    try {
      const re = new RegExp(pattern, flags);
      const m = re.exec(strings[0] || 'test');
      if (m?.groups) groupNames = Object.keys(m.groups);
    } catch {}
    return okResp({ valid: true, pattern, flags, groupNames, results });
  },

  jwt_decode(body) {
    const { token } = body;
    if (!token || typeof token !== 'string') return errResp('INVALID_INPUT', 'Missing "token" field');
    const parts = token.trim().split('.');
    if (parts.length !== 3) return errResp('INVALID_TOKEN', 'Token must have 3 parts (header.payload.signature)');
    const [hB64, pB64, sigB64] = parts;
    const header = base64UrlDecode(hB64);
    const payload = base64UrlDecode(pB64);
    if (!header || !payload) return errResp('DECODE_FAILED', 'Failed to decode header or payload');
    const expInfo = getExpiryInfo(payload.exp);
    const iatInfo = payload.iat ? { issuedAt: new Date(payload.iat * 1000).toISOString() } : {};
    return okResp({ header, payload, signature: sigB64, isExpired: expInfo.isExpired, expiresAt: expInfo.expiresAt, ttlSeconds: expInfo.ttlSeconds, ...iatInfo });
  },

  bcrypt_verify(body) {
    const { password, hash } = body;
    if (!password || typeof password !== 'string') return errResp('INVALID_INPUT', 'Missing "password" field');
    if (!hash || typeof hash !== 'string') return errResp('INVALID_INPUT', 'Missing "hash" field');
    try {
      const valid = bcrypt.compareSync(password, hash);
      return okResp({ valid, hashPreview: hash.slice(0, 8) + '...' });
    } catch (e) {
      return errResp('BCRYPT_ERROR', `Verification failed: ${e.message}`);
    }
  },

  hash_generate(body) {
    const { text, algorithm = 'sha256' } = body;
    if (!text || typeof text !== 'string') return errResp('INVALID_INPUT', 'Missing "text" field');
    const alg = algorithm.toLowerCase();
    try {
      if (alg === 'md5') {
        return okResp({ result: createHash('md5').update(text).digest('hex'), algorithm: 'MD5', inputSize: text.length });
      } else if (alg.startsWith('sha')) {
        return okResp({ result: createHash(alg).update(text).digest('hex'), algorithm: alg.toUpperCase(), inputSize: text.length });
      } else if (alg === 'bcrypt') {
        return okResp({ result: bcrypt.hashSync(text, 10), algorithm: 'BCrypt', inputSize: text.length });
      }
      return errResp('UNKNOWN_ALGORITHM', 'Supported: md5, sha1, sha256, sha512, bcrypt');
    } catch (e) {
      return errResp('HASH_ERROR', `Hash generation failed: ${e.message}`);
    }
  },
};

// ─── Schema Validation (lightweight) ──────────────────────

function validateSchema(instance, schema, path = '#') {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;
  if (schema.type) {
    const t = Array.isArray(instance) ? 'array' : instance === null ? 'null' : typeof instance;
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!allowed.includes(t)) errors.push({ path, message: `Expected ${schema.type}, got ${t}` });
  }
  if (schema.properties && typeof instance === 'object' && !Array.isArray(instance)) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (instance[key] !== undefined) {
        errors.push(...validateSchema(instance[key], propSchema, `${path}/${key}`));
      }
    }
  }
  if (schema.required && Array.isArray(schema.required)) {
    for (const req of schema.required) {
      if (instance[req] === undefined) errors.push({ path, message: `Missing required: ${req}` });
    }
  }
  if (schema.items && Array.isArray(instance)) {
    instance.forEach((item, i) => errors.push(...validateSchema(item, schema.items, `${path}[${i}]`)));
  }
  if (schema.minLength !== undefined && typeof instance === 'string' && instance.length < schema.minLength)
    errors.push({ path, message: `minLength ${schema.minLength}, got ${instance.length}` });
  if (schema.maxLength !== undefined && typeof instance === 'string' && instance.length > schema.maxLength)
    errors.push({ path, message: `maxLength ${schema.maxLength}, got ${instance.length}` });
  if (schema.minimum !== undefined && typeof instance === 'number' && instance < schema.minimum)
    errors.push({ path, message: `minimum ${schema.minimum}, got ${instance}` });
  if (schema.maximum !== undefined && typeof instance === 'number' && instance > schema.maximum)
    errors.push({ path, message: `maximum ${schema.maximum}, got ${instance}` });
  if (schema.pattern && typeof instance === 'string') {
    try { if (!new RegExp(schema.pattern).test(instance)) errors.push({ path, message: `Pattern mismatch` }); }
    catch {}
  }
  if (schema.enum && !schema.enum.includes(instance))
    errors.push({ path, message: `Must be one of: ${schema.enum.join(', ')}` });
  return errors;
}

// ─── JSON Diff ─────────────────────────────────────────────

function computeDiff(a, b, ignoreOrder = false) {
  const diffs = [];
  function recurse(objA, objB, path = '') {
    const tA = getType(objA);
    const tB = getType(objB);
    if (tA !== tB) { diffs.push({ path: path || '/', type: 'TYPE_MISMATCH', left: tA, right: tB }); return; }
    if (tA === 'object') {
      const allKeys = new Set([...Object.keys(objA), ...Object.keys(objB)]);
      for (const key of allKeys) {
        const np = path ? `${path}.${key}` : key;
        if (!(key in objB)) diffs.push({ path: np, type: 'REMOVED', left: objA[key], right: undefined });
        else if (!(key in objA)) diffs.push({ path: np, type: 'ADDED', left: undefined, right: objB[key] });
        else recurse(objA[key], objB[key], np);
      }
    } else if (tA === 'array') {
      if (ignoreOrder) {
        for (const item of objA) {
          const idxB = objB.findIndex(x => JSON.stringify(x) === JSON.stringify(item));
          if (idxB === -1) diffs.push({ path, type: 'ARRAY_REMOVED', left: item, right: undefined });
          else recurse(item, objB[idxB], path);
        }
        for (const item of objB) {
          if (!objA.some(x => JSON.stringify(x) === JSON.stringify(item))) diffs.push({ path, type: 'ARRAY_ADDED', left: undefined, right: item });
        }
      } else {
        const maxLen = Math.max(objA.length, objB.length);
        for (let i = 0; i < maxLen; i++) {
          if (i >= objA.length) diffs.push({ path: `${path}[${i}]`, type: 'ARRAY_ADDED', left: undefined, right: objB[i] });
          else if (i >= objB.length) diffs.push({ path: `${path}[${i}]`, type: 'ARRAY_REMOVED', left: objA[i], right: undefined });
          else recurse(objA[i], objB[i], `${path}[${i}]`);
        }
      }
    } else if (objA !== objB) {
      diffs.push({ path: path || '/', type: 'VALUE_MISMATCH', left: objA, right: objB });
    }
  }
  recurse(a, b);
  return diffs;
}

// ─── Zod / TypeScript Generators ───────────────────────────

function jsonToZod(obj, name = 'MySchema', depth = 0) {
  if (depth > 10) return 'z.any()';
  const t = getType(obj);
  if (t === 'string') return 'z.string()';
  if (t === 'number') return Number.isInteger(obj) ? 'z.number().int()' : 'z.number()';
  if (t === 'boolean') return 'z.boolean()';
  if (t === 'null') return 'z.null()';
  if (t === 'array') {
    if (obj.length === 0) return 'z.array(z.unknown())';
    const types = [...new Set(obj.map((item, i) => jsonToZod(item, `${name}Item${i}`, depth + 1)))];
    return types.length === 1 ? `z.array(${types[0]})` : `z.array(z.union([${types.join(', ')}]))`;
  }
  if (t === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return 'z.record(z.unknown())';
    const props = entries.map(([k, v]) => {
      const kn = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `"${k}"`;
      return `  ${kn}: ${jsonToZod(v, name, depth + 1)}`;
    });
    return `z.object({\n${props.join(',\n')}\n})`;
  }
  return 'z.unknown()';
}

function jsonToTS(obj, name = 'MyType', depth = 0) {
  if (depth > 10) return 'any';
  const t = getType(obj);
  if (t === 'string') return 'string';
  if (t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  if (t === 'null') return 'null';
  if (t === 'array') {
    if (obj.length === 0) return 'unknown[]';
    const types = [...new Set(obj.map((item, i) => jsonToTS(item, name, depth + 1)))];
    return types.length === 1 ? `${types[0]}[]` : `(${types.join(' | ')})[]`;
  }
  if (t === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return 'Record<string, unknown>';
    const props = entries.map(([k, v]) => {
      const kn = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `'${k}'`;
      return `  ${kn}: ${jsonToTS(v, name, depth + 1)};`;
    });
    return `{\n${props.join('\n')}\n}`;
  }
  return 'unknown';
}

// ─── JWT ───────────────────────────────────────────────────

function base64UrlDecode(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  try { return JSON.parse(decodeURIComponent(escape(atob(s)))); }
  catch { return null; }
}

function getExpiryInfo(exp) {
  if (!exp) return { isExpired: false, expiresAt: null, ttlSeconds: null };
  const expMs = (typeof exp === 'number' ? exp : parseInt(String(exp))) * 1000;
  const diff = expMs - Date.now();
  return { isExpired: diff <= 0, expiresAt: new Date(expMs).toISOString(), ttlSeconds: Math.round(diff / 1000) };
}

// ─── MCP Protocol ─────────────────────────────────────────

const TOOLS = [
  { name: 'json_format', description: 'Format and beautify JSON with optional custom indentation',
    inputSchema: { type: 'object', properties: { json: { type: 'string' }, indent: { type: 'number' } }, required: ['json'] } },
  { name: 'json_validate', description: 'Validate JSON syntax and optionally against a JSON Schema',
    inputSchema: { type: 'object', properties: { json: { type: 'string' }, schema: { type: 'string' } }, required: ['json'] } },
  { name: 'json_minify', description: 'Compress JSON by removing all whitespace',
    inputSchema: { type: 'object', properties: { json: { type: 'string' } }, required: ['json'] } },
  { name: 'json_diff', description: 'Compare two JSON values and return all differences',
    inputSchema: { type: 'object', properties: { jsonA: { type: 'string' }, jsonB: { type: 'string' }, ignoreOrder: { type: 'boolean' } }, required: ['jsonA', 'jsonB'] } },
  { name: 'json_to_zod', description: 'Generate Zod validation schema from sample JSON',
    inputSchema: { type: 'object', properties: { json: { type: 'string' }, name: { type: 'string' } }, required: ['json'] } },
  { name: 'json_to_typescript', description: 'Generate TypeScript type definition from sample JSON',
    inputSchema: { type: 'object', properties: { json: { type: 'string' }, name: { type: 'string' } }, required: ['json'] } },
  { name: 'json_token_count', description: 'Estimate LLM token count for a given text',
    inputSchema: { type: 'object', properties: { text: { type: 'string' }, model: { type: 'string' } }, required: ['text'] } },
  { name: 'regex_test', description: 'Test a regular expression pattern against one or more strings',
    inputSchema: { type: 'object', properties: { pattern: { type: 'string' }, flags: { type: 'string' }, testStrings: { type: 'array', items: { type: 'string' } } }, required: ['pattern'] } },
  { name: 'jwt_decode', description: 'Decode JWT token, return header/payload, check expiry',
    inputSchema: { type: 'object', properties: { token: { type: 'string' } }, required: ['token'] } },
  { name: 'bcrypt_verify', description: 'Verify a password matches a BCrypt hash',
    inputSchema: { type: 'object', properties: { password: { type: 'string' }, hash: { type: 'string' } }, required: ['password', 'hash'] } },
  { name: 'hash_generate', description: 'Generate hash of text using various algorithms',
    inputSchema: { type: 'object', properties: { text: { type: 'string' }, algorithm: { type: 'string' } }, required: ['text', 'algorithm'] } },
];

// ─── MCP Transport (stdio) ─────────────────────────────────

let buffer = '';

process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    if (!line.trim()) continue;
    try {
      const request = JSON.parse(line);
      handleRequest(request);
    } catch (e) {
      sendResponse({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    }
  }
});

function sendResponse(response) {
  process.stdout.write(JSON.stringify(response) + '\n');
}

async function handleRequest(req) {
  // JSON-RPC 2.0 batch or single
  const requests = Array.isArray(req) ? req : [req];
  const responses = [];

  for (const r of requests) {
    if (r.method === 'initialize') {
      responses.push({
        jsonrpc: '2.0', id: r.id,
        result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'jsonversal', version: '1.0.0' } }
      });
    } else if (r.method === 'tools/list') {
      responses.push({ jsonrpc: '2.0', id: r.id, result: { tools: TOOLS } });
    } else if (r.method === 'tools/call') {
      const { name, arguments: args = {} } = r.params;
      const handler = handlers[name];
      if (!handler) {
        responses.push({ jsonrpc: '2.0', id: r.id, error: { code: -32602, message: `Unknown tool: ${name}` } });
        continue;
      }
      try {
        const result = handler(args);
        responses.push({
          jsonrpc: '2.0', id: r.id,
          result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        });
      } catch (e) {
        responses.push({ jsonrpc: '2.0', id: r.id, error: { code: -32603, message: `Internal error: ${e.message}` } });
      }
    } else if (r.method === 'notifications/initialized' || r.method === 'ping') {
      // ack only
      if (r.method === 'ping') responses.push({ jsonrpc: '2.0', id: r.id, result: null });
    } else {
      responses.push({ jsonrpc: '2.0', id: r.id, error: { code: -32601, message: `Method not found: ${r.method}` } });
    }
  }

  for (const resp of responses) sendResponse(resp);
}

// Notify parent process we're ready
process.stderr.write('jsonversal MCP Server ready (stdio)\n');
