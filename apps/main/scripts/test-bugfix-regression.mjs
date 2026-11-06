/**
 * Regression suite for the 2026-11-07 tool-accuracy recheck fixes.
 *
 * Pure Node, zero dependencies. Each Astro page's last inline <script> is
 * extracted and executed against a minimal DOM stub, so the assertions test
 * the shipped client logic rather than a reimplementation of it.
 *
 *   node apps/main/scripts/test-bugfix-regression.mjs
 */
import fs from 'node:fs';
import vm from 'node:vm';

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

function lastScript(src) {
  const re = /<script[^>]*>([\s\S]*?)<\/script>/g;
  let m, all = [];
  while ((m = re.exec(src))) all.push(m[1]);
  if (!all.length) throw new Error('no inline script found');
  return all[all.length - 1];
}

function makeEl() {
  return {
    value: '', textContent: '', checked: false,
    style: { display: '' }, _h: {},
    addEventListener(ev, fn) { this._h[ev] = fn; },
    fire(ev) { if (this._h[ev]) this._h[ev](); },
  };
}

function boot(src, ids, setup) {
  const els = {};
  for (const id of ids) els[id] = makeEl();
  if (setup) setup(els);
  const sb = {
    console,
    document: { getElementById(id) { return els[id] || null; } },
    showToast() {}, setTimeout() { return 0; }, clearTimeout() {},
    navigator: { clipboard: { writeText: async () => {} } },
    location: { hash: '', pathname: '/', search: '', origin: 'https://example.test' },
    history: { replaceState() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    atob: s => Buffer.from(s, 'base64').toString('binary'),
  };
  vm.runInNewContext(lastScript(src), sb, { timeout: 10000 });
  return els;
}

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok    ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail === undefined ? '' : '  -> ' + JSON.stringify(detail))); }
}
const section = (title) => console.log('\n' + title);

// ─────────────────────────────────────────────────────────────────────────────
section('#3 sql-formatter — multi-word clauses must not be re-emitted');
const sqlSrc = read('../src/pages/codegen/tools/sql-formatter/index.astro');
const sqlIds = ['input', 'upper', 'indent', 'fmt', 'minify', 'sample', 'clear',
  'copy', 'out-section', 'err-section', 'output', 'meta', 'err-out'];
const SQL_CASES = [
  ['select * from t order by id limit 10', 'SELECT *\nFROM t\nORDER BY id\nLIMIT 10'],
  ['select a from t group by a limit 5', 'SELECT a\nFROM t\nGROUP BY a\nLIMIT 5'],
  ['select * from a left join b on a.id=b.id', 'SELECT *\nFROM a\nLEFT JOIN b\nON a.id = b.id'],
  ['insert into t values (1)', 'INSERT INTO t\nVALUES(1)'],
  ['select * from t union all select * from u', 'SELECT *\nFROM t\nUNION ALL\nSELECT *\nFROM u'],
  ['delete from t where id=1', 'DELETE FROM t\nWHERE id = 1'],
  ['select * from t having count(*)>1', 'SELECT *\nFROM t\nHAVING count(*) > 1'],
];
for (const [sql, expected] of SQL_CASES) {
  const els = boot(sqlSrc, sqlIds, e => {
    e.input.value = sql; e.upper.checked = true; e.indent.value = '2';
  });
  els.fmt.fire('click');
  check(sql, els.output.textContent === expected, els.output.textContent);
}
{
  const els = boot(sqlSrc, sqlIds, e => {
    e.input.value = "select 'order by' as x from t where note = '-- group by'";
    e.upper.checked = false; e.indent.value = '2';
  });
  els.fmt.fire('click');
  check('string literals are never re-tokenised', els.output.textContent.includes("'order by'"), els.output.textContent);
}
{
  const els = boot(sqlSrc, sqlIds, e => { e.input.value = 'select * from t order by id'; });
  els.minify.fire('click');
  check('minify keeps clause words intact', !/\bBY BY\b|\bJOIN JOIN\b|\bINTO INTO\b/.test(els.output.textContent), els.output.textContent);
}
check('clauseAt returns real token indices', /lastIndex: indices\[len - 1\]/.test(sqlSrc));

// ─────────────────────────────────────────────────────────────────────────────
section('#2 json-formatter — valid JSON must never be reported as invalid');
const jfSrc = read('../src/pages/tools/json-formatter/index.astro');
const jfIds = ['input', 'indent', 'format', 'minify', 'sample', 'clear', 'share',
  'output-text', 'output-section', 'output-copy', 'stats', 'err-section', 'err-out'];
{
  const els = boot(jfSrc, jfIds, e => {
    e.input.value = '{"ok":1,"arr":[1,2,3]}'; e.indent.value = '4';
  });
  els.format.fire('click');
  check('valid JSON renders', els['output-text'].textContent.includes('"ok": 1'));
  check('no false Invalid JSON', els['err-section'].style.display === 'none', els['err-out'].textContent);
  check('statistics populated', /keys/.test(els.stats.textContent) && els.stats.style.display === 'block', els.stats.textContent);
  check('output section visible', els['output-section'].style.display === 'block');

  els.input.value = '{"bad":}';
  els.format.fire('click');
  check('invalid JSON reports an error', els['err-section'].style.display === 'block' && els['err-out'].textContent.length > 0);
  check('output hidden on error', els['output-section'].style.display === 'none');

  els.input.value = '{ "a" : 1 }';
  els.minify.fire('click');
  check('recovers after an error', els['output-text'].textContent === '{"a":1}' && els['err-section'].style.display === 'none');

  els.clear.fire('click');
  check('clear hides output + stats', els['output-section'].style.display === 'none' && els.stats.style.display === 'none');
}
check('markup: #stats element exists', /id="stats"/.test(jfSrc));
check('markup: OutputPanel starts hidden', /initiallyHidden=\{true\}/.test(jfSrc));
check('no stale $(out-section) selector', !/\$\('out-section'\)/.test(jfSrc));
check('rendering moved outside the try block', /Rendering stays outside the try/.test(jfSrc));
check('OutputPanel exposes a slot', /<slot \/>/.test(read('../../../packages/ui/OutputPanel.astro')));

// ─────────────────────────────────────────────────────────────────────────────
section('#1 yaml-formatter — silent data loss must be visible');
const yfSrc = read('../src/pages/tools/yaml-formatter/index.astro');
const yfIds = ['indent', 'outputMode', 'input', 'output', 'err', 'errOut',
  'run', 'validateOnly', 'copy', 'clear'];
const yamlRun = text => {
  const els = boot(yfSrc, yfIds, e => {
    e.input.value = text; e.indent.value = '2'; e.outputMode.value = 'yaml';
  });
  els.run.fire('click');
  return els;
};
{
  const e = yamlRun('tags:\n  - a\n  - b');
  check('block sequence raises a notice', e.err.style.display === '' && /Block sequences/.test(e.errOut.textContent), e.errOut.textContent);
}
{
  const e = yamlRun('api:\n  version: v3\n  name: demo');
  check('clean mapping has no false notice', e.err.style.display === 'none', e.errOut.textContent);
  check('mapping still formats', /api:/.test(e.output.value), e.output.value);
}
{
  const e = yamlRun('---\na: 1');
  check('multi-document stream warned', /Multiple documents/.test(e.errOut.textContent), e.errOut.textContent);
}
{
  const e = yamlRun('a: 1 # note');
  check('dropped comments warned', /Comments/.test(e.errOut.textContent), e.errOut.textContent);
}
check('no client:load misuse on script', !/<script[^>]*client:/.test(yfSrc));

// ─────────────────────────────────────────────────────────────────────────────
section('#6 schema-to-typescript — required must be honoured by default');
const stSrc = read('../src/pages/codegen/tools/schema-to-typescript/index.astro');
check('strict mode checked by default in markup', /<input id="strict"[^>]*\bchecked\b/.test(stSrc));
const stIds = ['input', 'prefix', 'strict', 'export', 'gen', 'sample', 'clear',
  'copy', 'out-section', 'err-section', 'output', 'meta', 'err-out'];
const schema = JSON.stringify({
  title: 'Root', type: 'object',
  properties: { id: { type: 'integer' }, name: { type: 'string' } },
  required: ['id', 'name'],
});
for (const [label, strict, pattern, expected] of [
  ['strict ON: required fields non-optional', true, /id: number;/, true],
  ['strict OFF: every field optional', false, /id\?: number;/, true],
]) {
  const els = boot(stSrc, stIds, e => {
    e.input.value = schema; e.prefix.value = 'I'; e.strict.checked = strict;
  });
  els.gen.fire('click');
  check(label, pattern.test(els.output.textContent) === expected, els.output.textContent);
}

// ─────────────────────────────────────────────────────────────────────────────
section('#5 crontab — no silent blank run list');
const ctSrc = read('../src/pages/devops/tools/crontab/index.astro');
check('no client:load misuse on script', !/<script[^>]*client:/.test(ctSrc));
check('seconds participate in matching', /cron\.secSet\.has\(d\.getSeconds\(\)\)/.test(ctSrc));
const ctIds = ['expr', 'readable', 'next', 'parse', 'sample'];
const cron = expr => boot(ctSrc, ctIds, e => { e.expr.value = expr; });
{
  const e = cron('0 9 * * *');
  check('baseline renders 10 runs', e.next.textContent.split('\n').length === 10, e.next.textContent.slice(0, 80));
}
{
  const e = cron('0 9 * * 7');
  check('dow 7 (Sunday) now matches', e.next.textContent.split('\n').length === 10 && !/No upcoming runs/.test(e.next.textContent), e.next.textContent.slice(0, 80));
}
{
  const e = cron('9 * * jan *');
  check('month name jan now matches', e.next.textContent.split('\n').length === 10 && !/No upcoming runs/.test(e.next.textContent), e.next.textContent.slice(0, 80));
}
{
  const e = cron('0 9 * * monday');
  check('unknown name explains empty result', /No upcoming runs/.test(e.next.textContent) && /unrecognised day of week/.test(e.readable.textContent), { next: e.next.textContent.slice(0, 60), readable: e.readable.textContent.slice(-120) });
}
{
  const e = cron('monday');
  check('parse error still handled', /Parse error/.test(e.readable.textContent) && e.next.textContent === '—', e.readable.textContent);
}
{
  const e = cron('*/10 * * * * *');
  check('six-field expression produces runs', e.next.textContent.split('\n').length === 10 && !/No upcoming runs/.test(e.next.textContent), e.next.textContent.slice(0, 80));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
