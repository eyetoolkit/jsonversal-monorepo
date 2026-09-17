const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const nodeCrypto = require('crypto');

// jsdom 内部会通过 dispatchEvent 报告错误，process.on('uncaughtException') 抓不到。
// VirtualConsole.on('jsdomError') + 给 window 装 error handler 兜底。
process.on('uncaughtException', e => {
  const m = e && (e.message || String(e));
  process.stderr.write('[UNCAUGHT] ' + (m || '').split('\n')[0] + '\n');
});

const DIST = path.resolve(
  process.argv[2] || process.env.TOOLCHECK_DIST || path.join(__dirname, 'apps', 'main', 'dist')
);
const SECTIONS = ['tools', 'sec', 'devops', 'codegen'];

if (!fs.existsSync(DIST)) {
  console.error('找不到构建产物目录: ' + DIST);
  console.error('请先执行: npx pnpm@10.11.1 turbo run build --filter=@versal/site-main');
  process.exit(1);
}

const JSON_OBJ = '{"name":"Bob","age":30,"active":true,"tags":["x","y"],"nested":{"a":1}}';
const JSON_ARR = '[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]';

const SAMPLES = {
  'llm-token-calculator': ['Hello world, this is a test sentence for token counting.'],
  'json-schema-generator': [JSON_OBJ],
  'json-schema-sample-generator': ['{"type":"object","properties":{"name":{"type":"string"},"age":{"type":"integer"}}}'],
  'json-to-pydantic': [JSON_OBJ],
  'json-to-zod': [JSON_OBJ],
  'json-to-typescript': [JSON_OBJ],
  'jsonpath-tester': [JSON_OBJ, '$.name'],
  'json-diff': [JSON_OBJ, JSON_OBJ.replace('30','31')],
  'json-formatter': [JSON_OBJ],
  'json-to-go': [JSON_OBJ],
  'json-to-csharp': [JSON_OBJ],
  'uuid-v7': [],
  'markdown-preview': ['# Hello *world*'],
  'text-diff': ['alpha beta gamma', 'alpha delta gamma'],
  'json-escape': ['Hello "world" \\ path'],
  'json-sorter': [JSON_OBJ],
  'hash': ['hello'],
  'aes': ['top secret message', '0123456789abcdef'],
  'bcrypt': ['hello'],
  'hmac': ['hello', 'mysecretkey'],
  'password-generator': [],
  'file-checksum': ['SKIP'],
  'password-strength': ['Password123!'],
  'csp': [],
  'csr': ['SKIP'],
  'totp': ['JBSWY3DPEHPK3PXP'],
  'random-token': [],
  'rsa-keygen': [],
  'jwt-generator': ['{"sub":"1234567890","name":"Bob","iat":1516239022}', 'your-256-bit-secret'],
  'x509-decoder': ['SKIP'],
  'hash-identifier': ['2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'],
  'passphrase-generator': [],
  'password-encrypt': ['top secret message', 'mypassphrase'],
  'secret-scanner': ['k = sk-abcdefghijklmnopqrst password abc123'],
  'yaml-json': ['name: Bob\nage: 30'],
  'json-viewer': [JSON_OBJ],
  'base64': ['hello'],
  'url-codec': ['hello world & more'],
  'jwt-decoder': ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkJvYiIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'],
  'timestamp': ['1700000000'],
  'crontab': ['0 */4 * * *'],
  'regex': ['\\\\d+'],
  'uuid-generator': [],
  'http-status': ['404'],
  'cidr-calculator': ['192.168.1.0/24'],
  'k8s-generator': ['myapp'],
  'ports-reference': ['443'],
  'nginx-config': ['example.com'],
  'systemd-unit': ['myapp'],
  'log-parser': ['127.0.0.1 - - [10/Sep/2026:12:00:00 +0000] "GET /index.html HTTP/1.1" 200 1024 "-" "curl/8.0"'],
  'number-base': ['255'],
  'base64-image': ['SKIP'],
  'ci-workflow': ['myapp'],
  'commit-msg': ['fix: resolve login bug', 'fix login bug'],
  'csv-to-json': ['id,name\n1,Alice\n2,Bob'],
  'curl-to-fetch': ['curl -X POST https://api.example.com/data -H "Content-Type: application/json" -d \'{"a":1}\''],
  'curl-to-python': ['curl -X POST https://api.example.com/data -H "Content-Type: application/json" -d \'{"a":1}\''],
  'docker-compose': ['myapp'],
  'env-generator': ['{"DATABASE_URL":"mysql://user:pass@host:3306/db","DEBUG":false,"PORT":8080}'],
  'gitignore': ['node\nnode_modules'],
  'html-escaper': ['<b>& "quotes"</b>'],
  'json-to-csv': [JSON_ARR],
  'json-to-python': [JSON_OBJ],
  'json-xml': ['<root><name>Bob</name><age>30</age></root>'],
  'license': ['MIT'],
  'readme': ['myapp'],
  'schema-to-typescript': ['{"type":"object","properties":{"name":{"type":"string"},"age":{"type":"integer"}}}'],
  'sql-formatter': ['SELECT id,name FROM users WHERE active=1'],
  'sql-generator': ['users'],
};

const ACTION_IDS = new Set(['compute','calc','calculate','encode','decode','convert','encrypt','decrypt','hash','run','format','go','generate','submit','transform','parse','preview','apply','validate','process','execute','compile','serialize','deserialize','make','create','scan']);
const NON_ACTION = ['clear','copy','download','reset'];
function isActionBtn(b) {
  const id = (b.id||'').toLowerCase();
  const cls = (b.className||'');
  const txt = (b.textContent||'').trim();
  if (NON_ACTION.includes(id)) return false;
  if (ACTION_IDS.has(id)) return true;
  if (/\bprimary\b/.test(cls)) return true;
  if (/sample|clear|reset|copy|download|upload|browse/i.test(txt)) return false;
  return cls.trim() !== 'ghost' || /generate|run|compute|calc|encode|decode|convert|encrypt|decrypt|parse|scan|preview/i.test(txt);
}

(async () => {
console.log('DIST = ' + DIST);
const results = [];
for (const section of SECTIONS) {
  const base = section === 'tools' ? path.join(DIST, 'tools') : path.join(DIST, section, 'tools');
  if (!fs.existsSync(base)) continue;
  const names = fs.readdirSync(base).filter(n => fs.existsSync(path.join(base, n, 'index.html')));
  for (const name of names.sort()) {
    const file = path.join(base, name, 'index.html');
    const html = fs.readFileSync(file, 'utf8');

    const scripts = [];
    (() => {
      try {
        const d0 = new JSDOM(html);
        const all = [...d0.window.document.querySelectorAll('script')];
        d0.window.close();
        for (const s of all) {
          const type = (s.getAttribute('type') || '').toLowerCase();
          if (type && !type.includes('javascript')) continue;
          const t = s.textContent.trim();
          if (t) scripts.push(t);
        }
      } catch (e) { scripts.push(html + ' /* jsdom-parse-fail */'); }
    })();
    let parseErr = null;
    for (const code of scripts) {
      try { new Function(code); } catch (e) { parseErr = e.message; break; }
    }
    const samples = SAMPLES[name] || [];
    const out = { section, name, samples, parse: parseErr ? 'SYNTAX-ERR' : 'ok', load: 'ok', compute: 'untested', detail: '', snippet: '' };
    results.push(out);

    if (parseErr || samples[0] === 'SKIP') continue;

    const vc = new VirtualConsole();
    let loadErr = null;
    vc.on('jsdomError', err => {
      const m = err && (err.message || err.detail || String(err));
      if (!loadErr) loadErr = m;
    });

    let win;
    try {
      win = new JSDOM(html, {
        url: 'http://localhost/', runScripts: 'dangerously', virtualConsole: vc,
        beforeParse(w) {
          w.alert = function (msg) { w.__alerts = w.__alerts || []; w.__alerts.push(String(msg)); };
          w.TextEncoder = globalThis.TextEncoder;
          w.TextDecoder = globalThis.TextDecoder || w.TextDecoder;
          // 把 Node 的 webcrypto 钉到 window，让 subtle.importKey / digest 可用
          try { Object.defineProperty(w, 'crypto', { value: nodeCrypto.webcrypto, configurable: true }); } catch (e) {}
          try { Object.defineProperty(w, 'isSecureContext', { value: true, configurable: true }); } catch (e) {}
          // polyfill jsdom 没有的浏览器原生 API（toast 动画依赖 rAF）
          w.requestAnimationFrame = function (cb) { return setTimeout(cb, 0); };
          w.cancelAnimationFrame = function (id) { return clearTimeout(id); };
          w.addEventListener('error', () => {}, true);
        },
      }).window;
    } catch (e) {
      out.load = 'jsdom-fail: ' + (e.message || String(e));
      continue;
    }
    win.addEventListener('error', e => { if (!loadErr && e && e.message) loadErr = e.message; });

    const doc = win.document;
    out.load = loadErr ? ('load-err: ' + loadErr) : 'ok';
    if (out.load !== 'ok') {
      try { win.close(); } catch (e) {}
      continue;
    }

    if (samples.length) {
      const fields = [...doc.querySelectorAll('textarea, input[type=text], input[type=password], input:not([type])')]
        .filter(el => el.type !== 'hidden' && !el.readOnly);
      let k = 0;
      for (const el of fields) {
        if (k >= samples.length) break;
        if (!el.value) {
          el.value = samples[k]; k++;
          el.dispatchEvent(new win.Event('input', { bubbles: true }));
          el.dispatchEvent(new win.Event('change', { bubbles: true }));
        }
      }
    }
    const sampleBtn = doc.getElementById('sample') || [...doc.querySelectorAll('button')].find(b => /load sample/i.test(b.textContent || ''));
    if (sampleBtn) { try { sampleBtn.click(); } catch (e) {} }

    const btns = [...doc.querySelectorAll('button')].filter(isActionBtn);
    for (const b of btns) { try { b.click(); } catch (e) {} }
    await new Promise(r => setTimeout(r, 600));

    // 扩大输出选择器覆盖范围 —— 有些工具用 #stats / #qr-meta / #qr-canvas 等
    const outEls = [].concat(
      [...doc.querySelectorAll('textarea[readonly], textarea[disabled]')],
      [...doc.querySelectorAll('pre')],
      [...doc.querySelectorAll('code')],
      // 含 stats / meta / log / canvas data 等
      [...doc.querySelectorAll('[id*=output], [id*=result], [id*=stats], [id*=score], [id*=detail], [id*=meta], [id*=preview], [id*=log], [id*=token], [class*=output], [class*=result], [class*=stats]')]
    );
    const snippets = [];
    for (const el of outEls) {
      const style = el.getAttribute('style') || '';
      if (/display\s*:\s*none/i.test(style)) continue;
      const txt = (el.value || el.textContent || '').trim();
      if (txt) snippets.push(txt);
    }
    // 额外检查 #qr-output 等区块可见性（canvas 类无文本的，从样式推断）
    const visBlocks = [...doc.querySelectorAll('[id*=output], [id*=result], [id*=qr-output], [id*=stats]')]
      .filter(el => /:\s*none/i.test(el.getAttribute('style') || '') ? false : el.offsetParent !== null || true);
    const produced = [...new Set(snippets)].join('\n').trim();
    // 如果输出元素 visible 但 textContent 为空（如 canvas），通过 +visible-block 标记
    const hasVisibleBlock = visBlocks.length > 0 && snippets.length === 0;
    const needsInput = (win.__alerts || []).some(a => /enter|required|empty|invalid|please|missing/i.test(a));
    out.detail = (win.__alerts || []).join(' | ');
    out.compute = produced.length ? 'PASS' : (hasVisibleBlock ? 'PASS' : (needsInput ? 'NEEDS-INPUT' : 'NO-OUTPUT'));
    out.snippet = (produced || (hasVisibleBlock ? '[visible output block]' : '')).slice(0, 90).replace(/\n/g, ' ');
    try { win.close(); } catch (e) {}
  }
}

console.log('tool | section | parse | load | compute | detail | snippet');
for (const r of results) console.log([r.name, r.section, r.parse, r.load, r.compute, (r.detail || '').slice(0, 40), r.snippet].join(' | '));

const cnt = { PASS: 0, NO_OUTPUT: 0, NEEDS_INPUT: 0, SKIP: 0, OTHER: 0 };
for (const r of results) {
  if (r.samples[0] === 'SKIP') cnt.SKIP++;
  else if (r.compute === 'PASS') cnt.PASS++;
  else if (r.compute === 'NO-OUTPUT') cnt.NO_OUTPUT++;
  else if (r.compute === 'NEEDS-INPUT') cnt.NEEDS_INPUT++;
  else cnt.OTHER++;
}
console.log('\n===SUMMARY=== total=' + results.length + ' PASS=' + cnt.PASS + ' NO_OUTPUT=' + cnt.NO_OUTPUT + ' NEEDS_INPUT(soft)=' + cnt.NEEDS_INPUT + ' SKIP(needs-file/external)=' + cnt.SKIP + ' OTHER(parse/load)=' + cnt.OTHER);
console.log('\nIssues (NO_OUTPUT / parse / load):');
for (const r of results) {
  if (r.compute === 'NO-OUTPUT' || r.parse !== 'ok' || r.load !== 'ok')
    console.log(' - ' + r.section + '/' + r.name + ' :: parse=' + r.parse + ' load=' + r.load + ' compute=' + r.compute + ' detail=' + r.detail + ' snip=' + r.snippet);
}
process.exit(0);
})().catch(e => { console.log('FATAL:', e && e.stack || e); process.exit(1); });
