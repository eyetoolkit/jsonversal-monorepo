#!/usr/bin/env node
/**
 * Tool Accuracy Test Suite
 * Tests core tools by extracting their logic and running with known inputs.
 * 
 * Run: node scripts/test-tool-accuracy.mjs
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');

// ─── Test Result Tracking ───────────────────────────────────────────────────
const results = [];
function pass(name, expected, actual) {
  const ok = JSON.stringify(expected) === JSON.stringify(actual);
  results.push({ name, ok, expected, actual });
  console.log(`${ok ? '✅' : '❌'} ${name}${ok ? '' : `\n   expected: ${JSON.stringify(expected)}\n   actual:   ${JSON.stringify(actual)}`}`);
}

// ─── JSON Formatter / Minifier ─────────────────────────────────────────────
function jsonFormat(input, indent = 2) {
  const obj = JSON.parse(input);
  const ind = indent === 'tab' ? '\t' : Number(indent);
  return JSON.stringify(obj, null, ind);
}

function jsonMinify(input) {
  const obj = JSON.parse(input);
  return JSON.stringify(obj);
}

function jsonValidate(input) {
  try {
    JSON.parse(input);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

function jsonDiff(a, b) {
  const pa = JSON.parse(a);
  const pb = JSON.parse(b);
  const changes = [];
  const allKeys = new Set([...Object.keys(pa), ...Object.keys(pb)]);
  for (const k of allKeys) {
    const inA = k in pa, inB = k in pb;
    if (inA && !inB) changes.push({ op: 'remove', key: k, value: pa[k] });
    else if (!inA && inB) changes.push({ op: 'add', key: k, value: pb[k] });
    else if (JSON.stringify(pa[k]) !== JSON.stringify(pb[k])) changes.push({ op: 'replace', key: k, value_a: pa[k], value_b: pb[k] });
  }
  return changes;
}

// ─── JSON to Zod ───────────────────────────────────────────────────────────
function jsonToZod(input) {
  const obj = JSON.parse(input);
  let idx = 0;
  function inferType(val) {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'z.array(z.unknown())';
    if (typeof val === 'boolean') return 'z.boolean()';
    if (typeof val === 'number') return Number.isInteger(val) ? 'z.number()' : 'z.number()';
    if (typeof val === 'string') return 'z.string()';
    if (typeof val === 'object') {
      const entries = Object.entries(val);
      if (entries.length === 0) return 'z.record(z.unknown())';
      const inner = entries.map(([k, v]) => `${k}: ${inferType(v)}`).join(', ');
      return `{ ${inner} }`;
    }
    return 'z.unknown()';
  }
  if (Array.isArray(obj)) {
    return `import { z } from 'zod';\n\nexport const schema = z.array(z.object({\n${Object.keys(obj[0] || {}).map(k => `  ${k}: ${inferType(obj[0][k])}`).join(',\n')}\n}));`;
  }
  return `import { z } from 'zod';\n\nexport const schema = z.object({\n${Object.keys(obj).map(k => `  ${k}: ${inferType(obj[k])}`).join(',\n')}\n});`;
}

// ─── JSON to TypeScript ────────────────────────────────────────────────────
function jsonToTs(input) {
  const obj = JSON.parse(input);
  function toTs(val, name = 'Root') {
    if (val === null) return `export type ${name} = null;`;
    if (Array.isArray(val)) {
      const itemName = name.replace(/s$/, '') + 'Item';
      return val.length > 0 ? `${toTs(val[0], itemName)}\nexport type ${name} = ${itemName}[];` : `export type ${name} = unknown[];`;
    }
    if (typeof val === 'boolean') return `export type ${name} = boolean;`;
    if (typeof val === 'number') return `export type ${name} = number;`;
    if (typeof val === 'string') return `export type ${name} = string;`;
    if (typeof val === 'object') {
      const entries = Object.entries(val);
      if (entries.length === 0) return `export type ${name} = Record<string, unknown>;`;
      const props = entries.map(([k, v]) => `${k}: ${typeOf(v, k)};`).join('\n');
      return `export interface ${name} {\n${props}\n}`;
    }
    return `export type ${name} = unknown;`;
  }
  function typeOf(val, name) {
    if (val === null) return 'null';
    if (Array.isArray(val)) return val.length > 0 ? typeOf(val[0], name + 'Item') + '[]' : 'unknown[]';
    if (typeof val === 'boolean') return 'boolean';
    if (typeof val === 'number') return 'number';
    if (typeof val === 'string') return 'string';
    if (typeof val === 'object') return name;
    return 'unknown';
  }
  return toTs(obj);
}

// ─── LLM Token Calculator ──────────────────────────────────────────────────
const TOKEN_PRICES = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'claude-3.5-sonnet': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
};

function countTokens(text, model) {
  // Simple approximation: ~4 chars per token for English, ~1.5 for Chinese
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const nonChinese = text.length - chinese * 3; // Chinese chars counted 3x in original
  const tokens = Math.ceil(nonChinese / 4) + chinese;
  return tokens;
}

function calcCost(text, model) {
  const tokens = countTokens(text, model);
  const price = TOKEN_PRICES[model];
  if (!price) return null;
  return {
    tokens,
    inputCost: (tokens / 1e6) * price.input,
    outputCost: (tokens / 1e6) * price.output,
  };
}

// ─── BCrypt ────────────────────────────────────────────────────────────────
async function testBcrypt() {
  const pw = 'hello world';
  const hash = await bcrypt.hash(pw, 10);
  const match = await bcrypt.compare(pw, hash);
  const noMatch = await bcrypt.compare('wrong', hash);
  return { hash, match, noMatch };
}

// ─── JWT Decoder ───────────────────────────────────────────────────────────
function jwtDecode(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return { error: 'Invalid JWT format' };
  try {
    const decode = (s) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));
    return { header: decode(parts[0]), payload: decode(parts[1]), signature: parts[2] };
  } catch (e) {
    return { error: e.message };
  }
}

// ─── Regex Tester ─────────────────────────────────────────────────────────
function regexTest(pattern, text, flags = 'g') {
  try {
    const re = new RegExp(pattern, flags);
    const matches = [...text.matchAll(re)];
    return {
      valid: true,
      matches: matches.map(m => ({ match: m[0], index: m.index, groups: m.slice(1) }))
    };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

// ─── SQL Validator (custom tokenizer — LIMITED!) ──────────────────────────
const SQL_KEYWORDS = new Set(['SELECT','FROM','WHERE','INSERT','INTO','VALUES','UPDATE','SET','DELETE','CREATE','TABLE','ALTER','DROP','JOIN','LEFT','RIGHT','INNER','ON','AND','OR','ORDER','BY','GROUP','HAVING','LIMIT','OFFSET','UNION','AS','ASC','DESC','NULL','NOT','IN','LIKE','BETWEEN','EXISTS']);

function sqlValidate(sql, dialect = 'mysql') {
  const errors = [];
  const tokens = sql.trim().split(/\s+/);
  const first = tokens[0].toUpperCase();
  if (!['SELECT','INSERT','UPDATE','DELETE','CREATE','ALTER','DROP'].includes(first)) {
    errors.push(`Statement must start with SELECT/INSERT/UPDATE/DELETE/CREATE/ALTER/DROP, got: ${first}`);
  }
  // Check unclosed parens
  const opens = (sql.match(/\(/g) || []).length;
  const closes = (sql.match(/\)/g) || []).length;
  if (opens !== closes) errors.push(`Unbalanced parentheses: ${opens} open, ${closes} close`);
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

// ─── UUID Generator ────────────────────────────────────────────────────────
function uuidV4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ─── Hash Generator ────────────────────────────────────────────────────────
async function testHash() {
  // Test vectors from NIST
  const results = {};
  const crypto = await import('crypto');
  const testStr = 'abc';
  results['md5'] = crypto.createHash('md5').update(testStr).digest('hex');
  results['sha1'] = crypto.createHash('sha1').update(testStr).digest('hex');
  results['sha256'] = crypto.createHash('sha256').update(testStr).digest('hex');
  results['sha512'] = crypto.createHash('sha512').update(testStr).digest('hex');
  return results;
}

// ─── Run Tests ─────────────────────────────────────────────────────────────
async function run() {
  console.log('\n🧪 JSON Formatter/Minifier/Validate/Diff\n');
  
  // JSON Format
  const fmtInput = '{"a":1,"b":"hello"}';
  pass('jsonFormat indent=2', '{\n  "a": 1,\n  "b": "hello"\n}', jsonFormat(fmtInput, 2));
  pass('jsonFormat indent=4', '{\n    "a": 1,\n    "b": "hello"\n}', jsonFormat(fmtInput, 4));
  pass('jsonFormat tab', '{\n\t"a": 1,\n\t"b": "hello"\n}', jsonFormat(fmtInput, 'tab'));
  
  // JSON Minify
  pass('jsonMinify', '{"a":1,"b":"hello"}', jsonMinify('{\n  "a": 1,\n  "b": "hello"\n}'));
  
  // JSON Validate
  pass('jsonValidate valid', '{"valid":true}', JSON.stringify(jsonValidate('{"valid":true}')));
  pass('jsonValidate invalid', true, jsonValidate('not json').valid === false);
  pass('jsonValidate error msg', true, jsonValidate('not json').error.includes('Unexpected token'));
  
  // JSON Diff
  // Diff: {"a":1,"b":2} vs {"a":1,"c":3}
  // "a": same in both → no change
  // "b": in A only → remove
  // "c": in B only → add
  const diffResult = jsonDiff('{"a":1,"b":2}', '{"a":1,"c":3}');
  pass('jsonDiff detect change', 2, diffResult.length);
  pass('jsonDiff op=remove', 'remove', diffResult.find(c => c.key === 'b')?.op);
  pass('jsonDiff op=add', 'add', diffResult.find(c => c.key === 'c')?.op);

  console.log('\n🧪 JSON to Zod\n');
  const zodOut = jsonToZod('{"name":"Alice","age":30}');
  pass('jsonToZod has import', true, zodOut.includes("from 'zod'"));
  pass('jsonToZod has z.object', true, zodOut.includes('z.object'));
  pass('jsonToZod has name field', true, zodOut.includes('name: z.string()'));
  pass('jsonToZod has age field', true, zodOut.includes('age: z.number()'));

  console.log('\n🧪 JSON to TypeScript\n');
  const tsOut = jsonToTs('{"name":"Alice","age":30,"active":true}');
  pass('jsonToTs has export', true, tsOut.includes('export interface'));
  pass('jsonToTs has name', true, tsOut.includes('name: string'));
  pass('jsonToTs has age', true, tsOut.includes('age: number'));
  pass('jsonToTs has active', true, tsOut.includes('active: boolean'));

  console.log('\n🧪 LLM Token Calculator\n');
  const enText = 'Hello world this is a test sentence for token counting.';
  const zhText = '这是一段中文测试文字用于测试token计数功能';
  pass('tokenCalc english', true, countTokens(enText) > 0);
  pass('tokenCalc chinese', true, countTokens(zhText) > 0);  // Chinese chars present
  pass('tokenCalc cost gpt4o', true, calcCost(enText, 'gpt-4o') !== null);
  pass('tokenCalc cost claude', true, calcCost(zhText, 'claude-3.5-sonnet') !== null);

  console.log('\n🧪 BCrypt\n');
  const bc = await testBcrypt();
  pass('bcrypt hash starts with $2', true, bc.hash.startsWith('$2'));
  pass('bcrypt correct password', true, bc.match);
  pass('bcrypt wrong password', false, bc.noMatch);

  console.log('\n🧪 JWT Decoder\n');
  // Valid JWT (header.payload.signature with base64url encoding)
  const { header, payload } = jwtDecode('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  pass('jwtDecode header alg', 'HS256', header?.alg);
  pass('jwtDecode header typ', 'JWT', header?.typ);
  pass('jwtDecode payload sub', '1234567890', payload?.sub);
  pass('jwtDecode payload name', 'John Doe', payload?.name);
  pass('jwtDecode invalid format', true, jwtDecode('not-a-jwt').error === 'Invalid JWT format');

  console.log('\n🧪 Regex Tester\n');
  const rt = regexTest('\\w+', 'hello world');
  pass('regexTest valid pattern', true, rt.valid);
  pass('regexTest match count', 2, rt.matches.length);
  pass('regexTest match[0]', 'hello', rt.matches[0]?.match);
  pass('regexTest invalid pattern', false, regexTest('[', 'text').valid);

  console.log('\n🧪 SQL Validator\n');
  pass('sqlValidate SELECT valid', '{"valid":true}', JSON.stringify(sqlValidate('SELECT * FROM users WHERE id = 1')));
  pass('sqlValidate INSERT valid', '{"valid":true}', JSON.stringify(sqlValidate('INSERT INTO users (name) VALUES ("Alice")')));
  pass('sqlValidate unbalanced parens', '{"valid":false,"errors":["Unbalanced parentheses: 1 open, 0 close"]}', JSON.stringify(sqlValidate('SELECT * FROM users WHERE name IN ("Alice"')));
  pass('sqlValidate bad first keyword', '{"valid":false,"errors":["Statement must start with SELECT/INSERT/UPDATE/DELETE/CREATE/ALTER/DROP, got: DROPX"]}', JSON.stringify(sqlValidate('DROPX table users')));

  console.log('\n🧪 UUID v4\n');
  const u = uuidV4();
  pass('uuidV4 format', true, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(u));
  pass('uuidV4 uniqueness', true, uuidV4() !== u);

  console.log('\n🧪 Hash Generator\n');
  const hashes = await testHash();
  pass('hash md5 known', '900150983cd24fb0d6963f7d28e17f72', hashes.md5);
  pass('hash sha1 known', 'a9993e364706816aba3e25717850c26c9cd0d89d', hashes.sha1);
  pass('hash sha256 known', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', hashes.sha256);
  pass('hash sha512 length', 128, hashes.sha512.length);

  // Summary
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  const sep = '='.repeat(50);
  console.log(`\n${sep}`);
  console.log(`Results: ${passed} passed, ${failed} failed${failed === 0 ? ' ✅' : ' ❌'}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.name}`));
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
