// jsonversal MCP Server — additional deterministic tools for AI agents.
// All handlers are pure, side-effect free, and run server-side (Node).
import { randomBytes, randomUUID } from 'node:crypto';

function ok(data: any) { return { success: true, data }; }
function err(code: string, message: string) { return { error: { code, message } }; }

// ─── Base64 ────────────────────────────────────────────────
function base64_encode(body: any) {
  const { text } = body;
  if (text === undefined) return err('INVALID_INPUT', 'Missing "text" field');
  const buf = Buffer.from(String(text), 'utf8');
  return ok({ result: buf.toString('base64'), bytes: buf.length });
}
function base64_decode(body: any) {
  const { data, urlSafe = false } = body;
  if (!data || typeof data !== 'string') return err('INVALID_INPUT', 'Missing "data" field');
  const s = urlSafe ? data.replace(/-/g, '+').replace(/_/g, '/') : data;
  try {
    const buf = Buffer.from(s, 'base64');
    return ok({ result: buf.toString('utf8'), bytes: buf.length });
  } catch (e: any) { return err('DECODE_ERROR', e.message); }
}

// ─── URL encoding ──────────────────────────────────────────
function url_encode(body: any) {
  const { text } = body;
  if (text === undefined) return err('INVALID_INPUT', 'Missing "text" field');
  return ok({ result: encodeURIComponent(String(text)) });
}
function url_decode(body: any) {
  const { text } = body;
  if (text === undefined) return err('INVALID_INPUT', 'Missing "text" field');
  try { return ok({ result: decodeURIComponent(String(text)) }); }
  catch (e: any) { return err('DECODE_ERROR', e.message); }
}

// ─── Number base conversion (BigInt, 2..36) ────────────────
function parseBigIntRadix(str: string, radix: number): bigint | null {
  str = str.trim();
  let neg = false;
  if (str.startsWith('-')) { neg = true; str = str.slice(1); }
  else if (str.startsWith('+')) { str = str.slice(1); }
  if (!str.length) return null;
  let result = 0n;
  for (const ch of str) {
    const d = parseInt(ch, radix);
    if (isNaN(d) || d >= radix) return null;
    result = result * BigInt(radix) + BigInt(d);
  }
  return neg ? -result : result;
}
function number_base(body: any) {
  const { value, fromBase = 10, toBase = 10 } = body;
  if (value === undefined) return err('INVALID_INPUT', 'Missing "value" field');
  const from = Math.min(36, Math.max(2, +fromBase || 10));
  const to = Math.min(36, Math.max(2, +toBase || 10));
  const big = parseBigIntRadix(String(value), from);
  if (big === null) return err('INVALID_NUMBER', `Value is not a valid integer in base ${from}`);
  return ok({ result: big.toString(to), fromBase: from, toBase: to });
}

// ─── Timestamp conversion (deterministic UTC) ─────────────
function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const abs = Math.abs(diff);
  const units: [number, string][] = [[31536000000, 'year'], [2592000000, 'month'], [86400000, 'day'], [3600000, 'hour'], [60000, 'minute'], [1000, 'second']];
  for (const [ms2, name] of units) {
    if (abs >= ms2) { const v = Math.round(abs / ms2); return `${v} ${name}${v > 1 ? 's' : ''} ${diff >= 0 ? 'ago' : 'from now'}`; }
  }
  return 'just now';
}
function timestamp_convert(body: any) {
  let { value, unit } = body;
  let ms: number;
  if (value === undefined || value === null || value === 'now' || value === '') {
    ms = Date.now();
  } else if (typeof value === 'number') {
    const n = value;
    if (unit === 'ms') ms = n;
    else if (unit === 's') ms = n * 1000;
    else ms = n > 1e12 ? n : n * 1000; // auto: > year in ms → ms
  } else if (typeof value === 'string') {
    const t = value.trim();
    if (/^\d+$/.test(t)) {
      const n = Number(t);
      if (unit === 'ms') ms = n;
      else if (unit === 's') ms = n * 1000;
      else ms = t.length > 11 ? n : n * 1000; // 13+ digits → ms
    } else {
      const d = new Date(t);
      if (isNaN(d.getTime())) return err('INVALID_TIME', 'Unrecognized timestamp');
      ms = d.getTime();
    }
  } else return err('INVALID_INPUT', 'value must be a number or string');
  const date = new Date(ms);
  if (isNaN(date.getTime())) return err('INVALID_TIME', 'Invalid timestamp');
  return ok({
    unixSeconds: Math.floor(ms / 1000),
    unixMillis: ms,
    iso8601: date.toISOString(),
    utc: date.toUTCString(),
    relative: relativeTime(ms),
  });
}

// ─── CSV ⇄ JSON ────────────────────────────────────────────
function parseCSV(text: string, hasHeader: boolean) {
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQuotes = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++;
    } else {
      if (c === '"') { inQuotes = true; i++; }
      else if (c === ',') { row.push(field); field = ''; i++; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; }
      else { field += c; i++; }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') rows.pop();
  return { rows, hasHeader };
}
function cellToValue(v: string): any {
  const t = v.trim();
  if (t === '') return '';
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return v;
}
function csv_to_json(body: any) {
  const { csv, header = true } = body;
  if (!csv || typeof csv !== 'string') return err('INVALID_INPUT', 'Missing "csv" field');
  const { rows } = parseCSV(csv, header);
  if (!rows.length) return ok({ records: [], columns: [], rowCount: 0 });
  if (header) {
    const columns = rows[0];
    const records = rows.slice(1).map(r => {
      const o: any = {};
      columns.forEach((h, idx) => { o[h] = cellToValue(r[idx] ?? ''); });
      return o;
    });
    return ok({ records, columns, rowCount: records.length });
  }
  return ok({ rows, rowCount: rows.length });
}
function csvCell(v: any): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s) || s !== s.trim()) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function json_to_csv(body: any) {
  const { json } = body;
  if (json === undefined) return err('INVALID_INPUT', 'Missing "json" field');
  let data = json;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return err('PARSE_ERROR', 'Invalid JSON'); }
  }
  if (!Array.isArray(data)) return err('INVALID_INPUT', 'Expected a JSON array of objects');
  if (data.length === 0) return ok({ csv: '', columns: [], rowCount: 0 });
  const cols: string[] = [], seen = new Set<string>();
  for (const obj of data) {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const k of Object.keys(obj)) if (!seen.has(k)) { seen.add(k); cols.push(k); }
    }
  }
  const lines = [cols.join(',')];
  for (const obj of data) {
    const r = cols.map(k => csvCell(obj ? obj[k] : ''));
    lines.push(r.join(','));
  }
  return ok({ csv: lines.join('\n'), columns: cols, rowCount: data.length });
}

// ─── JSON → Python dict ────────────────────────────────────
function pyString(s: string): string {
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + "'";
}
function pyKey(k: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : pyString(k);
}
function jsonToPython(val: any, indent = 0): string {
  const pad = '  '.repeat(indent), pad1 = '  '.repeat(indent + 1);
  if (val === null) return 'None';
  if (val === true) return 'True';
  if (val === false) return 'False';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return pyString(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    const items = val.map(v => pad1 + jsonToPython(v, indent + 1));
    return '[\n' + items.join(',\n') + '\n' + pad + ']';
  }
  if (typeof val === 'object') {
    const entries = Object.entries(val);
    if (entries.length === 0) return '{}';
    const kv = entries.map(([k, v]) => pad1 + pyKey(k) + ': ' + jsonToPython(v, indent + 1));
    return '{\n' + kv.join(',\n') + '\n' + pad + '}';
  }
  return JSON.stringify(val);
}
function json_to_python(body: any) {
  const { json, variable = 'data' } = body;
  if (json === undefined) return err('INVALID_INPUT', 'Missing "json" field');
  let parsed = json;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return err('PARSE_ERROR', 'Invalid JSON'); }
  }
  const vname = /^[A-Za-z_][A-Za-z0-9_]*$/.test(variable) ? variable : 'data';
  return ok({ code: `${vname} = ${jsonToPython(parsed)}`, variable: vname });
}

// ─── JSON → Pydantic v2 models ─────────────────────────────
function pydanticType(v: any, ctx: any, nameHint: string): string {
  if (v === null) return 'Any';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
  if (typeof v === 'string') return 'str';
  if (Array.isArray(v)) {
    if (v.length === 0) return 'List[Any]';
    const inner = [...new Set(v.map((it: any) => pydanticType(it, ctx, nameHint + 'Item')))];
    return `List[${inner.length === 1 ? inner[0] : inner.join(' | ')}]`;
  }
  if (typeof v === 'object') { const cls = sanitizeClass(nameHint); buildPydantic(v, cls, ctx); return cls; }
  return 'Any';
}
function sanitizeClass(name: string): string {
  let n = name.replace(/[^A-Za-z0-9_]/g, '_');
  if (!/^[A-Za-z_]/.test(n)) n = '_' + n;
  return n.charAt(0).toUpperCase() + n.slice(1);
}
function buildPydantic(obj: any, name: string, ctx: any) {
  if (ctx.used.has(name)) return;
  ctx.used.add(name);
  const fields: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const t = pydanticType(v, ctx, capitalize(k));
    fields.push(`    ${pyKey(k)}: ${t}`);
  }
  ctx.classes.push(`class ${name}(BaseModel):\n${fields.join('\n') || '    pass'}`);
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function json_to_pydantic(body: any) {
  const { json, name = 'RootModel' } = body;
  if (json === undefined) return err('INVALID_INPUT', 'Missing "json" field');
  let parsed = json;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return err('PARSE_ERROR', 'Invalid JSON'); }
  }
  const ctx = { classes: [], used: new Set<string>() };
  const rootName = sanitizeClass(name);
  const rootType = pydanticType(parsed, ctx, rootName);
  if (!ctx.used.has(rootType) && typeof parsed === 'object' && !Array.isArray(parsed)) {
    buildPydantic(parsed, rootName, ctx);
  }
  let code = 'from typing import List, Any\nfrom pydantic import BaseModel\n\n' + ctx.classes.join('\n\n') + '\n';
  return ok({ code, rootModel: ctx.used.has(rootType) ? rootType : null });
}

// ─── JSONPath (subset) ─────────────────────────────────────
function recursiveCollect(node: any, key: string, out: any[]) {
  if (Array.isArray(node)) { for (const e of node) recursiveCollect(e, key, out); }
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) { if (k === key) out.push(v); recursiveCollect(v, key, out); }
  }
}
function evalFilter(item: any, expr: string): boolean {
  const m = expr.match(/^@\.([\w]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (!m) return false;
  const key = m[1], op = m[2], raw = m[3].trim();
  let val: any;
  if (raw === 'true') val = true; else if (raw === 'false') val = false; else if (raw === 'null') val = null;
  else if (/^'.*'$/.test(raw) || /^".*"$/.test(raw)) val = raw.slice(1, -1);
  else if (!isNaN(Number(raw))) val = Number(raw);
  else val = raw;
  const field = item && typeof item === 'object' ? item[key] : undefined;
  switch (op) {
    case '==': return field == val;
    case '!=': return field != val;
    case '>': return field > val;
    case '<': return field < val;
    case '>=': return field >= val;
    case '<=': return field <= val;
  }
  return false;
}
function parsePath(path: string): any[] {
  let p = path.trim();
  if (p.startsWith('$')) p = p.slice(1);
  const tokens: any[] = [];
  let i = 0;
  while (i < p.length) {
    const c = p[i];
    if (c === '.') {
      if (p[i + 1] === '.') { // recursive
        let j = i + 2; let name = '';
        while (j < p.length && /[\w]/.test(p[j])) { name += p[j]; j++; }
        tokens.push({ type: 'recursive', key: name }); i = j; continue;
      }
      let j = i + 1, name = '';
      while (j < p.length && /[\w]/.test(p[j])) { name += p[j]; j++; }
      if (name) { tokens.push({ type: 'child', key: name }); i = j; continue; }
      i++; continue;
    }
    if (c === '[') {
      const close = p.indexOf(']', i);
      if (close === -1) break;
      const inner = p.slice(i + 1, close).trim();
      if (inner === '*') tokens.push({ type: 'wildcard' });
      else if (inner.startsWith('?')) {
        tokens.push({ type: 'filter', expr: inner.slice(1).replace(/^\(|\)$/g, '').trim() });
      } else if (/^['"]/.test(inner)) {
        tokens.push({ type: 'child', key: inner.slice(1, -1) });
      } else if (/^-?\d+$/.test(inner)) {
        tokens.push({ type: 'index', i: parseInt(inner, 10) });
      }
      i = close + 1; continue;
    }
    i++;
  }
  return tokens;
}
function jsonpath_query(body: any) {
  const { json, path } = body;
  if (json === undefined || !path) return err('INVALID_INPUT', 'Missing "json" or "path" field');
  let data = json;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return err('PARSE_ERROR', 'Invalid JSON'); }
  }
  let nodes: any[] = [data];
  for (const tok of parsePath(path)) {
    const next: any[] = [];
    for (const node of nodes) {
      if (tok.type === 'child') { if (node && typeof node === 'object' && !Array.isArray(node) && tok.key in node) next.push(node[tok.key]); }
      else if (tok.type === 'index') { if (Array.isArray(node)) { const idx = tok.i < 0 ? node.length + tok.i : tok.i; if (idx >= 0 && idx < node.length) next.push(node[idx]); } }
      else if (tok.type === 'wildcard') { if (Array.isArray(node)) next.push(...node); else if (node && typeof node === 'object') next.push(...Object.values(node)); }
      else if (tok.type === 'recursive') { const out: any[] = []; recursiveCollect(node, tok.key, out); next.push(...out); }
      else if (tok.type === 'filter') { if (Array.isArray(node)) next.push(...node.filter((it: any) => evalFilter(it, tok.expr))); }
    }
    nodes = next;
  }
  return ok({ results: nodes, count: nodes.length });
}

// ─── UUID / token / password generation ───────────────────
function uuidV7(): string {
  const ts = Date.now();
  const b = randomBytes(10);
  const hex = (n: number, l: number) => n.toString(16).padStart(l, '0');
  const t = hex(ts, 12);
  const th = (b[0] & 0x0f) * 256 + b[1];            // 12 random bits after version nibble
  const v = ((b[2] & 0x3f) | 0x80) * 256 + b[3];     // RFC variant 10xx + 14 random bits
  const last = b.slice(4).toString('hex');            // 12 hex (6 bytes)
  return `${t.slice(0, 8)}-${t.slice(8, 12)}-7${hex(th, 3)}-${hex(v, 4)}-${last}`;
}
function uuid_generate(body: any) {
  const { version = 4, count = 1 } = body;
  const n = Math.min(Math.max(+count || 1, 1), 100);
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(+version === 7 ? uuidV7() : randomUUID());
  return ok({ uuids: out, version: +version === 7 ? 7 : 4 });
}
function random_token(body: any) {
  const { bytes = 32, encoding = 'hex' } = body;
  const n = Math.min(Math.max(+bytes || 32, 1), 1024);
  const buf = randomBytes(n);
  let result: string;
  if (encoding === 'base64url') result = buf.toString('base64url');
  else if (encoding === 'base64') result = buf.toString('base64');
  else result = buf.toString('hex');
  return ok({ token: result, bytes: n, encoding });
}
function password_generate(body: any) {
  const { length = 16, uppercase = true, lowercase = true, digits = true, symbols = true, count = 1 } = body;
  const sets: string[] = [];
  if (uppercase) sets.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  if (lowercase) sets.push('abcdefghijklmnopqrstuvwxyz');
  if (digits) sets.push('0123456789');
  if (symbols) sets.push('!@#$%^&*()-_=+[]{};:,.?/');
  if (sets.length === 0) return err('INVALID_CONFIG', 'Select at least one character set');
  const all = sets.join('');
  const len = Math.min(Math.max(+length || 16, 4), 128);
  const n = Math.min(Math.max(+count || 1, 1), 50);
  const out: string[] = [];
  for (let c = 0; c < n; c++) {
    const b = randomBytes(len * 3);
    const chars: string[] = [];
    let bi = 0;
    for (const s of sets) { chars.push(s[b[bi++] % s.length]); }
    for (let i = chars.length; i < len; i++) chars.push(all[b[bi++] % all.length]);
    for (let i = chars.length - 1; i > 0; i--) { const j = b[bi++] % (i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
    out.push(chars.join(''));
  }
  return ok({ passwords: out, length: len, characterSets: sets.length });
}

export const extraHandlers: Record<string, (body: any) => any> = {
  base64_encode, base64_decode,
  url_encode, url_decode,
  number_base,
  timestamp_convert,
  csv_to_json, json_to_csv,
  json_to_python, json_to_pydantic,
  jsonpath_query,
  uuid_generate, random_token, password_generate,
};

export const extraTools = [
  { name: 'base64_encode', description: 'Encode text to Base64 (UTF-8 safe)', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'base64_decode', description: 'Decode Base64 to text, optionally URL-safe', inputSchema: { type: 'object', properties: { data: { type: 'string' }, urlSafe: { type: 'boolean' } }, required: ['data'] } },
  { name: 'url_encode', description: 'Percent-encode a string for use in URLs (encodeURIComponent)', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'url_decode', description: 'Decode a percent-encoded URL string', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'number_base', description: 'Convert an integer between bases 2..36 (BigInt, no precision loss)', inputSchema: { type: 'object', properties: { value: { type: 'string' }, fromBase: { type: 'number' }, toBase: { type: 'number' } }, required: ['value'] } },
  { name: 'timestamp_convert', description: 'Convert between Unix seconds/ms and ISO-8601/UTC; pass "now" or omit value', inputSchema: { type: 'object', properties: { value: {}, unit: { type: 'string' } } } },
  { name: 'csv_to_json', description: 'Parse CSV (quotes, escapes, newlines) into JSON records or rows', inputSchema: { type: 'object', properties: { csv: { type: 'string' }, header: { type: 'boolean' } }, required: ['csv'] } },
  { name: 'json_to_csv', description: 'Convert a JSON array of objects into a CSV string with a header row', inputSchema: { type: 'object', properties: { json: {} }, required: ['json'] } },
  { name: 'json_to_python', description: 'Convert JSON into a valid Python dict literal', inputSchema: { type: 'object', properties: { json: {}, variable: { type: 'string' } }, required: ['json'] } },
  { name: 'json_to_pydantic', description: 'Generate valid Pydantic v2 models from sample JSON (handles nested + arrays)', inputSchema: { type: 'object', properties: { json: {}, name: { type: 'string' } }, required: ['json'] } },
  { name: 'jsonpath_query', description: 'Query JSON with a JSONPath subset ($.a.b, [n], [*], ..recursive, [?(@.k > 1)] filters)', inputSchema: { type: 'object', properties: { json: {}, path: { type: 'string' } }, required: ['json', 'path'] } },
  { name: 'uuid_generate', description: 'Generate cryptographically random UUIDs (v4 or v7)', inputSchema: { type: 'object', properties: { version: { type: 'number' }, count: { type: 'number' } } } },
  { name: 'random_token', description: 'Generate a secure random token (hex / base64 / base64url)', inputSchema: { type: 'object', properties: { bytes: { type: 'number' }, encoding: { type: 'string' } } } },
  { name: 'password_generate', description: 'Generate strong random passwords (guarantees ≥1 char per selected set)', inputSchema: { type: 'object', properties: { length: { type: 'number' }, uppercase: { type: 'boolean' }, lowercase: { type: 'boolean' }, digits: { type: 'boolean' }, symbols: { type: 'boolean' }, count: { type: 'number' } } } },
];
