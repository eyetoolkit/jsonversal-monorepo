#!/usr/bin/env node
// Extended tests: new agent tools + array-of-objects + stdio MCP protocol.
import { handlers } from './dist/index.js';
import { spawn } from 'node:child_process';

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}
function r(name, body) { return handlers[name](body); }

console.log('\n=== base64 ===');
const b64 = r('base64_encode', { text: 'héllo 🌍' });
check('encode', b64.success && Buffer.from(b64.data.result, 'base64').toString('utf8') === 'héllo 🌍', JSON.stringify(b64));
const b64d = r('base64_decode', { data: b64.data.result });
check('decode roundtrip', b64d.success && b64d.data.result === 'héllo 🌍');

console.log('\n=== url ===');
const ue = r('url_encode', { text: 'a b&c=d' });
check('url encode', ue.success && ue.data.result === 'a%20b%26c%3Dd', JSON.stringify(ue));
check('url decode', r('url_decode', { text: ue.data.result }).data.result === 'a b&c=d');

console.log('\n=== number_base ===');
check('bin→dec', r('number_base', { value: '1010', fromBase: 2, toBase: 10 }).data.result === '10');
check('dec→hex big', r('number_base', { value: '255', fromBase: 10, toBase: 16 }).data.result === 'ff');
check('bigint no loss', r('number_base', { value: '123456789012345678901234567890', fromBase: 10, toBase: 16 }).success);
check('invalid', r('number_base', { value: '12', fromBase: 2, toBase: 10 }).error !== undefined);

console.log('\n=== timestamp ===');
const now = r('timestamp_convert', {});
check('now -> iso', now.success && /^\d{4}-\d{2}-\d{2}T/.test(now.data.iso8601));
const s2iso = r('timestamp_convert', { value: 1700000000, unit: 's' });
check('s->iso', s2iso.data.iso8601 === '2023-11-14T22:13:20.000Z', JSON.stringify(s2iso));
check('ms->iso', r('timestamp_convert', { value: 1700000000000, unit: 'ms' }).data.iso8601 === '2023-11-14T22:13:20.000Z');

console.log('\n=== csv_to_json ===');
const csv = 'name,age\n"Smith, John",30\nJane,25';
const cj = r('csv_to_json', { csv });
check('rows', cj.data.rowCount === 2, JSON.stringify(cj));
check('quoted comma', cj.data.records[0].name === 'Smith, John');
check('typed number', cj.data.records[0].age === 30);

console.log('\n=== json_to_csv ===');
const jc = r('json_to_csv', { json: [{ a: 1, b: 'x,y' }, { a: 2, b: 'z' }] });
check('header+row', jc.data.csv.split('\n').length === 3, JSON.stringify(jc));
check('comma quoted', jc.data.csv.includes('"x,y"'), JSON.stringify(jc));

console.log('\n=== json_to_python ===');
const jp = r('json_to_python', { json: { name: "it's", list: [1, true, null], nested: { k: "v" } } });
const py = jp.data.code;
check('dict literal', py.includes('nested: {'), py);
check('bool/None', py.includes('True') && py.includes('None'));
check('single-quote escape', py.includes("'it\\'s'"), py);

console.log('\n=== json_to_pydantic ===');
const jpyd = r('json_to_pydantic', { json: { name: 'x', address: { city: 'y' }, tags: ['a', 'b'] } });
const pyd = jpyd.data.code;
check('root class', pyd.includes('class RootModel(BaseModel):'));
check('nested class', pyd.includes('class Address(BaseModel):'));
check('List[str]', pyd.includes('tags: List[str]'));
check('field type', pyd.includes('city: str'));

console.log('\n=== jsonpath_query ===');
const doc = { store: { books: [{ price: 5 }, { price: 15 }] }, title: 'T' };
check('child', r('jsonpath_query', { json: doc, path: '$.title' }).data.results[0] === 'T');
check('index', r('jsonpath_query', { json: doc, path: '$.store.books[1].price' }).data.results[0] === 15);
check('wildcard', r('jsonpath_query', { json: doc, path: '$.store.books[*].price' }).data.results.length === 2);
check('filter', r('jsonpath_query', { json: doc, path: "$.store.books[?(@.price > 10)]" }).data.results.length === 1);

console.log('\n=== uuid / token / password ===');
const u4 = r('uuid_generate', { version: 4, count: 3 });
check('uuid v4 x3', u4.data.uuids.length === 3 && /^[0-9a-f-]{36}$/.test(u4.data.uuids[0]));
const u7 = r('uuid_generate', { version: 7, count: 1 });
check('uuid v7', /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/.test(u7.data.uuids[0]), u7.data.uuids[0]);
const tok = r('random_token', { bytes: 16, encoding: 'base64url' });
check('token len', tok.data.token.length > 0);
const pw = r('password_generate', { length: 20, symbols: false });
check('password len', pw.data.passwords[0].length === 20);
check('password has upper', /[A-Z]/.test(pw.data.passwords[0]));

console.log('\n=== json_to_typescript array-of-objects (existing) ===');
const ts = r('json_to_typescript', { json: { items: [{ a: 1 }, { b: 2 }] } });
check('union in array', ts.data.typeDefinition.includes('({') && ts.data.typeDefinition.includes('a: number') && ts.data.typeDefinition.includes('b: number') && ts.data.typeDefinition.includes('})[]'), ts.data.typeDefinition);
const tsValid = r('json_to_typescript', { json: { x: [{ p: 1 }, { q: 's' }] } });
check('nested union', tsValid.data.typeDefinition.includes('p: number') && tsValid.data.typeDefinition.includes('q: string'));

console.log(`\n--- handler tests: ${pass} passed, ${fail} failed ---`);

// ─── stdio MCP protocol end-to-end ─────────────────────────
console.log('\n=== stdio MCP protocol ===');
await new Promise((resolve) => {
  const child = spawn(process.execPath, ['dist/index.js'], { env: { ...process.env, STDOUT_MODE: 'mcp' } });
  let out = '', done = false;
  const send = (obj) => child.stdin.write(JSON.stringify(obj) + '\n');
  child.stdout.on('data', (d) => {
    out += d.toString();
    if (!done && out.split('\n').filter(Boolean).length >= 3) {
      done = true;
      const lines = out.split('\n').filter(Boolean).map(l => JSON.parse(l));
      const init = lines.find(l => l.id === 1);
      const list = lines.find(l => l.id === 2);
      const call = lines.find(l => l.id === 3);
      check('initialize', init?.result?.serverInfo?.name === 'jsonversal');
      check('tools/list includes new tool', list?.result?.tools?.some(t => t.name === 'jsonpath_query'));
      const callResult = call?.result?.content?.[0]?.text;
      check('tools/call base64_encode works', !!callResult && JSON.parse(callResult).success);
      child.kill();
      resolve();
    }
  });
  child.stderr.on('data', () => {});
  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'base64_encode', arguments: { text: 'hi' } } });
  setTimeout(() => { if (!done) { child.kill(); console.log('  ✗ protocol timeout'); resolve(); } }, 5000);
});

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
