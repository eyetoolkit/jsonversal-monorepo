/**
 * 校验注入后的工具页：about 区块、TOC、JS 错误、锚点死链、MD5 正确性
 *
 * 分两段（对应 skill 记录的三个必踩坑）：
 *   1. 浏览器由外部 shell 先起好，本脚本只负责连 CDP —— Node spawn 在沙箱里起不来 Edge。
 *   2. /json/list 首个 target 常常是扩展 background_page，必须筛掉。
 *   3. 等 DOM 用轮询，不用固定 sleep。
 *
 * 用法：
 *   1) 起浏览器（端口 9411）
 *   2) node tools/geo-gen/verify-about.mjs [port]
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const ROOT = path.resolve(import.meta.dirname, '../..');
const DIST = path.join(ROOT, 'apps/main/dist');
const PORT = Number(process.argv[2]) || 9411;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml' };

// —— 静态服务器 ——
let srvPort = 8477 + Math.floor(Math.random() * 300);
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(srvPort, r));
const BASE = `http://127.0.0.1:${srvPort}`;

function walk(d, out = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (f === 'index.html') out.push('/' + path.relative(DIST, p).replace(/\\/g, '/').replace(/index\.html$/, ''));
  }
  return out;
}
const routes = walk(DIST).filter(r => /\/tools\/[^/]+\/$/.test(r)).sort();

// —— 连 CDP ——
async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const t = list.find(x => x.type === 'page' && !x.url.startsWith('chrome-extension://'));
      if (t?.webSocketDebuggerUrl) return t.webSocketDebuggerUrl;
    } catch {}
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error('CDP 不可达：先在 shell 里启动 Edge --headless=new --remote-debugging-port=' + PORT);
}
const ws = new WebSocket(await getWsUrl());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
let errors = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push('EXC: ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || ''));
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    errors.push('LOG: ' + m.params.entry.text + ' @ ' + (m.params.entry.url || ''));
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errors.push('CON: ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' '));
  }
};
const send = (method, params = {}) => new Promise(res => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
  return r.result?.result?.value;
};
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');

const PROBE = `(() => {
  const blk = document.querySelector('.about-block');
  const toc = document.querySelector('.toc');
  const secs = [...document.querySelectorAll('.about-section')];
  const anchors = secs.map(s => s.querySelector('h2')?.id).filter(Boolean);
  const tocLinks = toc ? [...toc.querySelectorAll('a')].map(a => a.getAttribute('href')) : [];
  const broken = tocLinks.filter(h => h && h !== '#faq-title' && !document.getElementById(h.slice(1)));
  return {
    about: !!blk, toc: !!toc, sections: secs.length, anchors,
    duplicateAnchors: anchors.length !== new Set(anchors).size,
    brokenLinks: broken, tocLinks: tocLinks.length,
    words: blk ? blk.textContent.trim().split(/\\s+/).filter(Boolean).length : 0,
    hasFaq: !!document.getElementById('faq-title'),
  };
})()`;

async function check(route) {
  errors = [];
  await send('Page.navigate', { url: BASE + route });
  let probe = null;
  for (let i = 0; i < 50; i++) {
    try { probe = await evaluate(PROBE); } catch {}
    if (probe?.about) break;
    await new Promise(r => setTimeout(r, 120));
  }
  // 首屏之后再给一点时间，让懒执行/异步脚本的错误浮出来
  await new Promise(r => setTimeout(r, 150));
  return { route, ...probe, errors: errors.filter(e => !/favicon|ERR_FILE_NOT_FOUND|\/fonts\//.test(e)) };
}

const results = [];
for (let i = 0; i < routes.length; i++) {
  results.push(await check(routes[i]));
  if ((i + 1) % 15 === 0) console.error(`  ...已测 ${i + 1}/${routes.length}`);
}

console.log(`\n=== ${routes.length} 个工具页实测（无头 Edge, CDP ${PORT}） ===\n`);
const w = results.map(r => r.words || 0);
const n = results.length;
console.log('about 区块     :', results.filter(r => r.about).length + '/' + n);
console.log('TOC           :', results.filter(r => r.toc).length + '/' + n);
console.log('小节 >= 2     :', results.filter(r => r.sections >= 2).length + '/' + n);
console.log('锚点唯一      :', results.filter(r => !r.duplicateAnchors).length + '/' + n);
console.log('TOC 无死链    :', results.filter(r => !r.brokenLinks?.length).length + '/' + n);
console.log('FAQ 锚点存在  :', results.filter(r => r.hasFaq).length + '/' + n);
console.log('零 JS 错误    :', results.filter(r => r.errors.length === 0).length + '/' + n);
console.log('正文字数      : min=' + Math.min(...w) + '  max=' + Math.max(...w) + '  avg=' + Math.round(w.reduce((a, b) => a + b, 0) / w.length));

const problems = results.filter(r => !r.about || !r.toc || r.sections < 2 || r.duplicateAnchors || r.brokenLinks?.length || r.errors.length);
if (problems.length) {
  console.log('\n!!! 有问题的页面:');
  for (const p of problems) console.log('  ', p.route, JSON.stringify({ sections: p.sections, dup: p.duplicateAnchors, broken: p.brokenLinks, err: p.errors }).slice(0, 300));
} else {
  console.log('\n全部通过。');
}

// —— MD5 功能验证 ——
console.log('\n=== 功能验证：MD5 ===');
await check('/sec/tools/hash/');
const md5out = await evaluate(`(() => {
  const t = document.getElementById('result')?.textContent || '';
  const m = t.match(/MD5\\s*\\n([0-9a-f]{32})/i);
  return m ? m[1] : null;
})()`);
const MD5_EXPECT = '5eb63bbbe01eeed093cb22bb8f5acdc3'; // md5("hello world")
console.log(`hash 页 MD5("hello world") = ${md5out} ${md5out === MD5_EXPECT ? '✓' : '✗ 期望 ' + MD5_EXPECT}`);

await check('/sec/tools/hash-generator/');
const md5gen = await evaluate(`(async () => {
  document.getElementById('input').value = 'hello world';
  document.getElementById('algo').value = 'MD5';
  document.getElementById('run').click();
  await new Promise(r => setTimeout(r, 300));
  return document.getElementById('output').value;
})()`);
console.log(`hash-generator MD5("hello world") = ${md5gen} ${md5gen === MD5_EXPECT ? '✓' : '✗'}`);

const hmacmd5 = await evaluate(`(async () => {
  document.getElementById('mode').value = 'hmac';
  document.getElementById('mode').dispatchEvent(new Event('change'));
  document.getElementById('hmacKey').value = 'Jefe';
  document.getElementById('input').value = 'what do ya want for nothing?';
  document.getElementById('run').click();
  await new Promise(r => setTimeout(r, 300));
  return document.getElementById('output').value;
})()`);
const HMAC_EXPECT = '750c783e6ab0b503eaa86e310a5db738'; // RFC 2202 test case 2
console.log(`hash-generator HMAC-MD5(key=Jefe) = ${hmacmd5} ${hmacmd5 === HMAC_EXPECT ? '✓' : '✗ 期望 ' + HMAC_EXPECT}`);

const sqlv = await check('/codegen/tools/sql-validator/');
const falsePositive = await evaluate(`(() => {
  const ta = document.querySelector('textarea');
  return ta ? ta.id || 'has-textarea' : 'none';
})()`);
console.log(`sql-validator JS 错误数: ${sqlv.errors.length} ${sqlv.errors.length === 0 ? '✓' : '✗ ' + sqlv.errors.join('; ')}`);

server.close();
process.exit(problems.length === 0 && md5out === MD5_EXPECT && md5gen === MD5_EXPECT && hmacmd5 === HMAC_EXPECT ? 0 : 1);