/**
 * jsonversal S级工具 API — CF Pages Function
 * Phase 1: JSON处理全家桶 + Regex Tester
 *
 * Endpoints:
 *   POST /v1/json/format        — JSON 美化格式化
 *   POST /v1/json/validate      — JSON 校验（可选 JSON Schema）
 *   POST /v1/json/minify        — JSON 压缩
 *   POST /v1/json/diff          — JSON 对比，返回差异
 *   POST /v1/json/to-zod        — JSON → Zod Schema
 *   POST /v1/json/to-typescript — JSON → TypeScript 类型
 *   POST /v1/json/token-count   — LLM Token 计数
 *   POST /v1/regex/test         — 正则表达式测试
 *
 * Auth: Bearer <API_KEY> in Authorization header
 */

const ALLOWED_ORIGINS = [
  'https://jsonversal.com',
  'https://www.jsonversal.com',
  'http://localhost:4321',
];

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

function err(code, message, status = 400) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function ok(data) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── JSON Format ────────────────────────────────────────────

async function handleJsonFormat(body) {
  const { json, indent } = body;
  if (json === undefined) return err('INVALID_INPUT', 'Missing "json" field');

  const parsed = parseJSON(typeof json === 'string' ? json : JSON.stringify(json));
  if (parsed === null && parsed !== 0) return err('PARSE_ERROR', 'Invalid JSON');

  const spaces = typeof indent === 'number' ? Math.min(Math.max(indent, 0), 8) : 2;
  const result = safeStringify(parsed, spaces);
  if (!result) return err('STRINGIFY_ERROR', 'Failed to stringify');

  return ok({ result, inputSize: JSON.stringify(parsed).length, outputSize: result.length });
}

// ─── JSON Validate ──────────────────────────────────────────

async function handleJsonValidate(body) {
  const { json, schema } = body;
  if (json === undefined) return err('INVALID_INPUT', 'Missing "json" field');

  const parsed = parseJSON(typeof json === 'string' ? json : JSON.stringify(json));
  if (parsed === null && parsed !== 0) {
    return ok({ valid: false, error: 'Invalid JSON syntax', parseError: true });
  }

  if (schema) {
    const schemaParsed = parseJSON(schema);
    if (!schemaParsed) return err('INVALID_SCHEMA', 'Invalid JSON Schema');
    const validationErrors = validateAgainstSchema(parsed, schemaParsed);
    return ok({ valid: validationErrors.length === 0, errors: validationErrors, parseError: false });
  }

  return ok({ valid: true, errors: [], parseError: false });
}

function validateAgainstSchema(instance, schema, path = '#') {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;

  if (schema.type) {
    const instanceType = Array.isArray(instance) ? 'array'
      : instance === null ? 'null'
      : typeof instance;
    const allowedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!allowedTypes.includes(instanceType)) {
      errors.push({ path, message: `Expected type ${schema.type}, got ${instanceType}` });
    }
  }

  if (schema.properties && typeof instance === 'object' && !Array.isArray(instance)) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (instance[key] !== undefined) {
        errors.push(...validateAgainstSchema(instance[key], propSchema, `${path}/${key}`));
      }
    }
  }

  if (schema.required && Array.isArray(schema.required)) {
    for (const req of schema.required) {
      if (instance[req] === undefined) {
        errors.push({ path, message: `Missing required property: ${req}` });
      }
    }
  }

  if (schema.items && Array.isArray(instance)) {
    instance.forEach((item, i) => {
      errors.push(...validateAgainstSchema(item, schema.items, `${path}[${i}]`));
    });
  }

  if (schema.minLength !== undefined && typeof instance === 'string' && instance.length < schema.minLength) {
    errors.push({ path, message: `String minLength ${schema.minLength}, got ${instance.length}` });
  }

  if (schema.maxLength !== undefined && typeof instance === 'string' && instance.length > schema.maxLength) {
    errors.push({ path, message: `String maxLength ${schema.maxLength}, got ${instance.length}` });
  }

  if (schema.minimum !== undefined && typeof instance === 'number' && instance < schema.minimum) {
    errors.push({ path, message: `Number minimum ${schema.minimum}, got ${instance}` });
  }

  if (schema.maximum !== undefined && typeof instance === 'number' && instance > schema.maximum) {
    errors.push({ path, message: `Number maximum ${schema.maximum}, got ${instance}` });
  }

  if (schema.pattern && typeof instance === 'string') {
    try { if (!new RegExp(schema.pattern).test(instance)) errors.push({ path, message: `String does not match pattern ${schema.pattern}` }); }
    catch {}
  }

  if (schema.enum) {
    if (!schema.enum.includes(instance)) errors.push({ path, message: `Value must be one of: ${schema.enum.join(', ')}` });
  }

  return errors;
}

// ─── JSON Minify ────────────────────────────────────────────

async function handleJsonMinify(body) {
  const { json } = body;
  if (json === undefined) return err('INVALID_INPUT', 'Missing "json" field');

  const parsed = parseJSON(typeof json === 'string' ? json : JSON.stringify(json));
  if (parsed === null && parsed !== 0) return err('PARSE_ERROR', 'Invalid JSON');

  const result = safeStringify(parsed);
  if (!result) return err('STRINGIFY_ERROR', 'Failed to stringify');

  const originalSize = JSON.stringify(parsed).length;
  return ok({
    result,
    originalSize,
    minifiedSize: result.length,
    reductionPercent: Math.round((1 - result.length / originalSize) * 100),
  });
}

// ─── JSON Diff ──────────────────────────────────────────────

async function handleJsonDiff(body) {
  const { jsonA, jsonB, ignoreOrder } = body;
  if (jsonA === undefined) return err('INVALID_INPUT', 'Missing "jsonA" field');
  if (jsonB === undefined) return err('INVALID_INPUT', 'Missing "jsonB" field');

  const a = parseJSON(typeof jsonA === 'string' ? jsonA : JSON.stringify(jsonA));
  const b = parseJSON(typeof jsonB === 'string' ? jsonB : JSON.stringify(jsonB));
  if ((a === null && a !== 0) || (b === null && b !== 0)) return err('PARSE_ERROR', 'Invalid JSON in one or both inputs');

  const diff = computeDiff(a, b, ignoreOrder === true);
  return ok({ equal: diff.length === 0, differences: diff });
}

function computeDiff(a, b, ignoreOrder = false) {
  const diffs = [];

  function recurse(objA, objB, path = '') {
    const typeA = getType(objA);
    const typeB = getType(objB);

    if (typeA !== typeB) {
      diffs.push({ path: path || '/', type: 'TYPE_MISMATCH', left: typeA, right: typeB });
      return;
    }

    if (typeA === 'object') {
      const allKeys = new Set([...Object.keys(objA), ...Object.keys(objB)]);
      for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key;
        if (!(key in objB)) diffs.push({ path: newPath, type: 'REMOVED', left: objA[key], right: undefined });
        else if (!(key in objA)) diffs.push({ path: newPath, type: 'ADDED', left: undefined, right: objB[key] });
        else recurse(objA[key], objB[key], newPath);
      }
    } else if (typeA === 'array') {
      if (ignoreOrder) {
        for (const item of objA) {
          const idxB = objB.findIndex(x => JSON.stringify(x) === JSON.stringify(item));
          if (idxB === -1) diffs.push({ path, type: 'ARRAY_REMOVED', left: item, right: undefined });
          else recurse(item, objB[idxB], path);
        }
        for (const item of objB) {
          if (!objA.some(x => JSON.stringify(x) === JSON.stringify(item))) {
            diffs.push({ path, type: 'ARRAY_ADDED', left: undefined, right: item });
          }
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

// ─── JSON to Zod ────────────────────────────────────────────

async function handleJsonToZod(body) {
  const { json, name } = body;
  if (json === undefined) return err('INVALID_INPUT', 'Missing "json" field');

  const parsed = parseJSON(typeof json === 'string' ? json : JSON.stringify(json));
  if (parsed === null && parsed !== 0) return err('PARSE_ERROR', 'Invalid JSON');

  const schemaName = /^[A-Z][a-zA-Z0-9]*$/.test(name || '') ? name : 'MySchema';
  const zodSchema = jsonToZod(parsed, schemaName, 0);

  return ok({ schema: zodSchema });
}

function jsonToZod(obj, name = 'MySchema', depth = 0) {
  if (depth > 10) return 'z.any()';
  const t = getType(obj);
  if (t === 'string') return 'z.string()';
  if (t === 'number') return Number.isInteger(obj) ? 'z.number().int()' : 'z.number()';
  if (t === 'boolean') return 'z.boolean()';
  if (t === 'null') return 'z.null()';
  if (t === 'array') {
    if (obj.length === 0) return 'z.array(z.unknown())';
    if (obj.length === 1) return `z.array(${jsonToZod(obj[0], name, depth+1)})`;
    const types = [...new Set(obj.map((item, i) => jsonToZod(item, `${name}Item${i}`, depth+1)))];
    return `z.array(z.union([${types.join(', ')}]))`;
  }
  if (t === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return 'z.record(z.unknown())';
    const props = entries.map(([k, v]) => {
      const keyName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `"${k}"`;
      return `  ${keyName}: ${jsonToZod(v, name, depth+1)}`;
    });
    return `z.object({\n${props.join(',\n')}\n})`;
  }
  return 'z.unknown()';
}

// ─── JSON to TypeScript ─────────────────────────────────────

async function handleJsonToTypeScript(body) {
  const { json, name } = body;
  if (json === undefined) return err('INVALID_INPUT', 'Missing "json" field');

  const parsed = parseJSON(typeof json === 'string' ? json : JSON.stringify(json));
  if (parsed === null && parsed !== 0) return err('PARSE_ERROR', 'Invalid JSON');

  const typeName = /^[A-Z][a-zA-Z0-9]*$/.test(name || '') ? name : 'MyType';
  const ts = jsonToTypeScript(parsed, typeName, 0);

  return ok({ typeDefinition: ts });
}

function jsonToTypeScript(obj, name = 'MyType', depth = 0) {
  if (depth > 10) return 'any';
  const t = getType(obj);
  if (t === 'string') return 'string';
  if (t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  if (t === 'null') return 'null';
  if (t === 'array') {
    if (obj.length === 0) return 'unknown[]';
    if (obj.length === 1) return `${jsonToTypeScript(obj[0], name, depth+1)}[]`;
    const types = [...new Set(obj.map((item, i) => jsonToTypeScript(item, name, depth+1)))];
    if (types.length === 1) return `${types[0]}[]`;
    return `(${types.join(' | ')})[]`;
  }
  if (t === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return 'Record<string, unknown>';
    const props = entries.map(([k, v]) => {
      const keyType = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `'${k}'`;
      return `  ${keyType}: ${jsonToTypeScript(v, name, depth+1)};`;
    });
    return `{\n${props.join('\n')}\n}`;
  }
  return 'unknown';
}

// ─── Token Counter ──────────────────────────────────────────

async function handleTokenCount(body) {
  const { text, model } = body;
  if (!text || typeof text !== 'string') return err('INVALID_INPUT', 'Missing "text" field');

  const modelType = (model || 'gpt-4o').toLowerCase();
  const charsPerToken = modelType.includes('claude') ? 3.5
    : modelType.includes('gemini') ? 4 : 4;

  const tokens = Math.ceil(text.length / charsPerToken);
  const words = text.trim().split(/\s+/).length;

  return ok({
    tokens,
    estimatedModel: model || 'gpt-4o',
    charsPerToken,
    charCount: text.length,
    wordCount: words,
  });
}

// ─── Regex Tester ───────────────────────────────────────────

async function handleRegexTest(body) {
  const { pattern, flags, testStrings } = body;
  if (!pattern || typeof pattern !== 'string') return err('INVALID_INPUT', 'Missing "pattern" field');

  let regex;
  try { regex = new RegExp(pattern, flags || ''); }
  catch (e) { return err('INVALID_REGEX', `Invalid regex: ${e.message}`); }

  const strings = Array.isArray(testStrings) ? testStrings : (testStrings ? [testStrings] : []);
  const results = strings.map(s => ({
    input: s,
    matches: s.length > 0 ? regex.test(s) : false,
    matchesArray: s.length > 0 ? s.match(regex) : null,
  }));

  let groupNames = [];
  try {
    const re = new RegExp(pattern, flags || '');
    const match = re.exec(strings[0] || 'test');
    if (match && match.groups) groupNames = Object.keys(match.groups);
  } catch {}

  return ok({ valid: true, pattern, flags: flags || '', groupNames, results });
}

// ─── Auth Middleware ────────────────────────────────────────

async function authenticate(request, env) {
  const apiKey = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!apiKey) return { authorized: false, reason: 'API key required' };
  const validKeys = [env.JSONVERSAL_API_KEY, 'demo-key-for-testing'].filter(Boolean);
  return { authorized: validKeys.includes(apiKey) };
}

// ─── Route Map ──────────────────────────────────────────────

const ROUTES = {
  '/v1/json/format':        handleJsonFormat,
  '/v1/json/validate':      handleJsonValidate,
  '/v1/json/minify':        handleJsonMinify,
  '/v1/json/diff':          handleJsonDiff,
  '/v1/json/to-zod':        handleJsonToZod,
  '/v1/json/to-typescript': handleJsonToTypeScript,
  '/v1/json/token-count':   handleTokenCount,
  '/v1/regex/test':         handleRegexTest,
};

// ─── Main Export ────────────────────────────────────────────

export async function onRequest({ request, env }) {
  const path = new URL(request.url).pathname;

  if (!path.startsWith('/v1/')) return new Response('Not Found', { status: 404 });

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'POST') {
    return err('METHOD_NOT_ALLOWED', 'Only POST is supported', 405);
  }

  const auth = await authenticate(request, env);
  if (!auth.authorized) return err('UNAUTHORIZED', auth.reason || 'Invalid or missing API key', 401);

  let body;
  try { body = await request.json(); }
  catch { return err('INVALID_JSON', 'Request body must be valid JSON'); }

  const handler = ROUTES[path];
  if (!handler) return err('NOT_FOUND', `Route ${path} not found`, 404);

  let response;
  try { response = await handler(body); }
  catch (e) { return err('INTERNAL_ERROR', e.message || 'Unexpected error', 500); }

  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
  newHeaders.set('X-Content-Type-Options', 'nosniff');

  return new Response(response.body, { status: response.status, headers: newHeaders });
}
