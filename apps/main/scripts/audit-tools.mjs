#!/usr/bin/env node
/**
 * jsonversal 工具可用性与准确性检测脚本
 * =========================================
 * 
 * 分层检测：
 * L0 - HTTP 探活：每个页面 200 / Content-Type / 安全头
 * L1 - HTML 结构：title / H1 / script 标签 / DOM 关键元素
 * L2 - JS 语法：提取 inline script，new Function() 验证无语法错误
 * L3 - 功能正确性：jsdom 模拟 DOM + 种子输入 + 验证输出
 *
 * 用法：
 * node scripts/audit-tools.mjs [--url https://jsonversal.com] [--only json-formatter] [--level L3]
 *
 * 输出：
 * audit-report.md - 人类可读报告
 * audit-report.json - 机器可读结果
 */

import { JSDOM } from 'jsdom';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { webcrypto } from 'node:crypto';

// Node v22 已经有全局 crypto，但 jsdom window 上没挂，需要手动 polyfill
const nodeCrypto = webcrypto;

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPS_MAIN = resolve(__dirname, '..');
const REPO_ROOT = resolve(APPS_MAIN, '../..');
const SRC_PAGES = resolve(APPS_MAIN, 'src/pages');

// ========== 1. 扫描工具 URL ==========

function scanTools() {
 const tools = [];
 
 const walkDir = (dir, parts = []) => {
 const entries = readdirSync(dir);
 for (const entry of entries) {
 const full = join(dir, entry);
 const stat = statSync(full);
 if (stat.isDirectory()) {
 walkDir(full, [...parts, entry]);
 } else if (entry === 'index.astro') {
 // 跳过非工具页面（首页、栏目索引、隐私/条款）
 const slug = parts[parts.length - 1];
 if (['tools', 'sec', 'devops', 'codegen'].includes(slug)) continue;
 if (['privacy', 'terms', 'licenses'].includes(slug)) continue;
 if (parts.length === 0) continue;
 
 // 构建 URL path
 const path = '/' + parts.join('/') + '/';
 tools.push({ path, file: full, parts });
 }
 }
 };
 
 walkDir(SRC_PAGES);
 return tools.sort((a, b) => a.path.localeCompare(b.path));
}

// （fs/path 的 readdirSync/statSync/join 已在顶部 import）

// ========== 2. HTTP 探活 (L0) ==========

async function fetchPage(url, timeout = 8000) {
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), timeout);
 
 try {
 const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
 const text = await res.text();
 return { ok: true, status: res.status, headers: Object.fromEntries(res.headers), body: text, time: 0 };
 } catch (e) {
 return { ok: false, error: e.message };
 } finally {
 clearTimeout(timer);
 }
}

// ========== 3. HTML 结构检查 (L1) ==========

function checkHtml(body, tool) {
 const issues = [];
 const dom = new JSDOM(body, { url: tool.url, runScripts: 'outside-only', pretendToBeVisual: true });
 const doc = dom.window.document;
 
 // Title
 const title = doc.querySelector('title');
 if (!title || !title.textContent.trim()) issues.push('MISSING_TITLE');
 
 // H1
 const h1 = doc.querySelector('h1');
 if (!h1) issues.push('MISSING_H1');
 
 // 安全头（HTTP 层已经检查过，这里看 HTML meta）
 const csp = doc.querySelector('meta[http-equiv=Content-Security-Policy]');
 // CSP 通常在 HTTP header，HTML meta 里不一定有
 
 // Script 标签
 const inlineScripts = doc.querySelectorAll('script:not([src])');
 const externalScripts = doc.querySelectorAll('script[src]');
 
 // 检查所有 script[src] 是否是同源
 externalScripts.forEach(s => {
 const src = s.getAttribute('src');
 if (src && !src.startsWith('/') && !src.includes('jsonversal.com')) {
 issues.push(`EXTERNAL_SCRIPT:${src}`);
 }
 });
 
 // 提取内联 script 内容（只提取真正的 JS，跳过 ld+json 等）
 const scripts = [];
 inlineScripts.forEach(s => {
 const type = s.getAttribute('type');
 // type 为空 / text/javascript / module 才是 JS
 if (type && type !== 'text/javascript' && type !== 'module') return;
 const code = s.textContent;
 if (code && code.trim().length > 10) scripts.push(code);
 });
 
 return { issues, title: title?.textContent?.trim() || '', h1: h1?.textContent?.trim() || '', scripts, dom };
}

// ========== 4. JS 语法检查 (L2) ==========

function checkJsSyntax(scripts) {
 const issues = [];
 for (const code of scripts) {
 try {
 new Function(code);
 } catch (e) {
 issues.push(`JS_SYNTAX:${e.message.substring(0, 200)}`);
 }
 }
 return issues;
}

// ========== 5. 功能正确性种子用例 (L3) ==========

const SEED_CASES = {
 '/tools/json-formatter/': {
 setup: async (dom) => {
 const doc = dom.window.document;
 doc.getElementById('input').value = '{name:Alice,age:30,active:true}';
 doc.getElementById('format').click();
 await new Promise(r => setTimeout(r, 100));
 return doc.getElementById('output')?.textContent;
 },
 expect: (out) => {
 if (!out) return 'NO_OUTPUT';
 try {
 const parsed = JSON.parse(out);
 return parsed.name === 'Alice' ? null : 'WRONG_VALUE';
 } catch { return 'OUTPUT_NOT_JSON'; }
 }
 },
 '/tools/json-minify/': {
 setup: async (dom) => {
 const doc = dom.window.document;
 doc.getElementById('input').value = '{name:Alice,age:30}';
 // 找到 minify 按钮（可能在同页面或不同页面）
 const btn = doc.querySelector('button#minify, button#format');
 if (btn) btn.click();
 await new Promise(r => setTimeout(r, 100));
 return doc.getElementById('output')?.textContent;
 },
 expect: (out) => out && out === '{name:Alice,age:30}' ? null : 'MINIFY_WRONG'
 },
 '/sec/tools/hash/': {
 setup: async (dom) => {
 const doc = dom.window.document;
 doc.getElementById('input').value = 'hello world';
 doc.getElementById('hash').click();
 await new Promise(r => setTimeout(r, 300));
 return doc.getElementById('result')?.textContent;
 },
 expect: (out) => {
 if (!out) return 'NO_OUTPUT';
 // SHA-256 of hello world 是 ba59a599...
 if (!out.includes('ba59a5994541274988aa')) return 'SHA256_WRONG';
 return null;
 }
 },
 '/devops/tools/base64/': {
 setup: async (dom) => {
 const doc = dom.window.document;
 doc.getElementById('input').value = 'hello';
 const btn = doc.querySelector('button#encode, button#run, button.primary');
 if (btn) btn.click();
 await new Promise(r => setTimeout(r, 100));
 return doc.getElementById('output')?.textContent || doc.getElementById('out')?.textContent;
 },
 expect: (out) => out && out.trim().toLowerCase().includes('agvsbg8=') ? null : 'BASE64_WRONG'
 },
 '/devops/tools/timestamp/': {
 setup: async (dom) => {
 const doc = dom.window.document;
 const btn = doc.querySelector('button, [role=button]');
 if (btn) btn.click();
 await new Promise(r => setTimeout(r, 100));
 return doc.body.textContent;
 },
 expect: (out) => out && /\d{10,}/.test(out) ? null : 'TIMESTAMP_NO_NUMBER'
 },
 '/sec/tools/password-generator/': {
 setup: async (dom) => {
 const doc = dom.window.document;
 const btn = doc.querySelector('button.primary, button#generate, button');
 if (btn) btn.click();
 await new Promise(r => setTimeout(r, 100));
 return doc.getElementById('output')?.textContent || doc.querySelector('input[readonly], pre')?.textContent;
 },
 expect: (out) => out && out.length >= 8 ? null : 'PASSWORD_TOO_SHORT'
 },
 '/devops/tools/uuid-generator/': {
 setup: async (dom) => {
 const doc = dom.window.document;
 const btn = doc.querySelector('button.primary, button#generate, button');
 if (btn) btn.click();
 await new Promise(r => setTimeout(r, 100));
 const text = doc.body.textContent;
 const match = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
 return match ? match[0] : null;
 },
 expect: (out) => out && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(out) ? null : 'UUID_FORMAT_WRONG'
 },
 '/tools/markdown-preview/': {
 setup: async (dom) => {
 const doc = dom.window.document;
 const ta = doc.querySelector('textarea');
 if (ta) { ta.value = '# Hello\n\nThis is **bold**.'; }
 const btn = doc.querySelector('button.primary, button#render, button');
 if (btn) btn.click();
 await new Promise(r => setTimeout(r, 100));
 return doc.querySelector('.preview, #preview, .output')?.innerHTML || doc.body.innerHTML;
 },
 expect: (out) => out && out.includes('<h1') ? null : 'MD_NO_H1'
 }
};

async function checkFunctionality(tool, htmlResult) {
 const case_ = SEED_CASES[tool.path];
 if (!case_) return { skipped: true };
 
 const issues = [];
 try {
 // 重新创建一个可以跑 script 的 jsdom
 const dom = new JSDOM(htmlResult.body, {
 url: tool.url,
 runScripts: 'dangerously',
 resources: 'usable',
 pretendToBeVisual: true
 });
 try { Object.defineProperty(dom.window, 'crypto', { value: nodeCrypto, configurable: true }); } catch(e) { dom.window.crypto = nodeCrypto; }
 // 也 polyfill 其他浏览器 API
 if (!dom.window.fetch) dom.window.fetch = (...args) => fetch(...args);
 
 // 等 script 执行完
 await new Promise(r => setTimeout(r, 300));
 
 const output = await case_.setup(dom);
 const issue = case_.expect(output);
 if (issue) issues.push(`FUNC_${issue}`);
 
 // 关闭 window
 dom.window.close();
 } catch (e) {
 issues.push(`FUNC_ERROR:${e.message.substring(0, 150)}`);
 }
 return { issues };
}

// ========== 6. 主流程 ==========

async function main() {
 const args = process.argv.slice(2);
 const baseUrl = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'https://jsonversal.com';
 const onlySlug = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
 const maxLevel = args.includes('--level') ? args[args.indexOf('--level') + 1] : 'L3';
 
 console.log('🔍 jsonversal 工具检测');
 console.log(` 目标: ${baseUrl}`);
 console.log(` 级别: L0 → ${maxLevel}`);
 console.log('');
 
 // 扫描工具
 let tools = scanTools();
 console.log(`📂 扫描到 ${tools.length} 个工具页面`);
 
 if (onlySlug) {
 tools = tools.filter(t => t.path.includes(onlySlug));
 console.log(`🎯 只测: ${onlySlug} (${tools.length} 个)`);
 }
 
 const results = [];
 let pass = 0, fail = 0, skip = 0;
 
 for (let i = 0; i < tools.length; i++) {
 const tool = tools[i];
 tool.url = baseUrl + tool.path;
 
 process.stdout.write(`\r [${i+1}/${tools.length}] ${tool.path.padEnd(45)}`);
 
 const result = {
 path: tool.path,
 url: tool.url,
 levels: {}
 };
 
 // L0: HTTP
 const http = await fetchPage(tool.url);
 result.levels.L0 = { ok: http.ok, status: http.status };
 
 if (!http.ok) {
 result.levels.L0.error = http.error;
 results.push(result);
 fail++;
 continue;
 }
 if (http.status !== 200) {
 result.levels.L0.error = `HTTP ${http.status}`;
 results.push(result);
 fail++;
 continue;
 }
 
 // 安全头检查
 const headers = http.headers;
 const secIssues = [];
 if (!headers['strict-transport-security']) secIssues.push('MISSING_HSTS');
 if (!headers['content-security-policy']) secIssues.push('MISSING_CSP');
 if (!headers['x-frame-options']) secIssues.push('MISSING_XFO');
 result.levels.L0.security = secIssues;
 
 // L1: HTML 结构
 const html = checkHtml(http.body, tool);
 result.levels.L1 = { issues: html.issues, title: html.title, hasH1: !!html.h1 };
 
 // L2: JS 语法
 if (html.scripts.length > 0) {
 const jsIssues = checkJsSyntax(html.scripts);
 result.levels.L2 = { scripts: html.scripts.length, issues: jsIssues };
 } else {
 result.levels.L2 = { scripts: 0, skipped: 'NO_INLINE_SCRIPT' };
 }
 
 // L3: 功能正确性
 if (maxLevel >= 'L3' && SEED_CASES[tool.path]) {
 const funcResult = await checkFunctionality(tool, http);
 result.levels.L3 = funcResult;
 } else if (maxLevel >= 'L3') {
 result.levels.L3 = { skipped: 'NO_SEED_CASE' };
 }
 
 // 判定
 const allIssues = [
 ...secIssues,
 ...(result.levels.L1?.issues || []),
 ...(result.levels.L2?.issues || []),
 ...(result.levels.L3?.issues || [])
 ];
 
 result.summary = allIssues.length === 0 ? '✅ PASS' : `❌ FAIL (${allIssues.length} issues)`;
 result.allIssues = allIssues;
 
 allIssues.length === 0 ? pass++ : fail++;
 results.push(result);
 }
 
 console.log(`\n\n📊 结果: ${pass} 通过 · ${fail} 失败`);
 
 // 输出 Markdown 报告
 let md = `# jsonversal 工具检测报告\n\n`;
 md += `生成时间: ${new Date().toISOString()}\n\n`;
 md += `目标: **${baseUrl}**\n\n`;
 md += `| 指标 | 值 |\n|---|---|\n`;
 md += `| 工具总数 | ${tools.length} |\n`;
 md += `| ✅ 通过 | ${pass} |\n`;
 md += `| ❌ 失败 | ${fail} |\n`;
 md += `| 通过率 | ${((pass / tools.length) * 100).toFixed(1)}% |\n\n`;
 
 // 安全头汇总
 const hstsMiss = results.filter(r => r.levels.L0?.security?.includes('MISSING_HSTS')).length;
 const cspMiss = results.filter(r => r.levels.L0?.security?.includes('MISSING_CSP')).length;
 const xfoMiss = results.filter(r => r.levels.L0?.security?.includes('MISSING_XFO')).length;
 md += `### 安全头检查\n\n`;
 md += `| 头部 | 缺失数 |\n|---|---|\n`;
 md += `| HSTS | ${hstsMiss} |\n`;
 md += `| CSP | ${cspMiss} |\n`;
 md += `| X-Frame-Options | ${xfoMiss} |\n\n`;
 
 // 失败列表
 const failed = results.filter(r => r.summary?.startsWith('❌'));
 if (failed.length > 0) {
 md += `### ❌ 失败项（${failed.length}）\n\n`;
 md += `| URL | 问题 |\n|---|---|\n`;
 for (const r of failed) {
 md += `| [${r.path}](${r.url}) | ${r.allIssues.join(', ')} |\n`;
 }
 md += '\n';
 }
 
 // JS 语法错误
 const jsErr = results.filter(r => r.levels.L2?.issues?.length > 0);
 if (jsErr.length > 0) {
 md += `### 🔴 JS 语法错误（${jsErr.length}）\n\n`;
 for (const r of jsErr) {
 md += `- **${r.path}**: ${r.levels.L2.issues.join('; ')}\n`;
 }
 md += '\n';
 }
 
 // 功能测试失败
 const funcFail = results.filter(r => r.levels.L3?.issues?.length > 0);
 if (funcFail.length > 0) {
 md += `### 🔴 功能测试失败（${funcFail.length}）\n\n`;
 for (const r of funcFail) {
 md += `- **${r.path}**: ${r.levels.L3.issues.join('; ')}\n`;
 }
 md += '\n';
 }
 
 // 完整列表
 md += `### 全部工具\n\n`;
 md += `| # | URL | L0 | L1 | L2 | L3 | 状态 |\n|---|---|---|---|---|---|---|\n`;
 results.forEach((r, i) => {
 const l0 = r.levels.L0?.ok === false ? '❌' : r.levels.L0?.security?.length ? '⚠️' : '✅';
 const l1 = r.levels.L1?.issues?.length ? '❌' : '✅';
 const l2 = r.levels.L2?.issues?.length ? '❌' : r.levels.L2?.scripts === 0 ? '—' : '✅';
 const l3 = r.levels.L3?.issues?.length ? '❌' : r.levels.L3?.skipped ? '—' : '✅';
 md += `| ${i+1} | [${r.path}](${r.url}) | ${l0} | ${l1} | ${l2} | ${l3} | ${r.summary} |\n`;
 });
 
 writeFileSync(resolve(__dirname, 'audit-report.md'), md);
 writeFileSync(resolve(__dirname, 'audit-report.json'), JSON.stringify(results, null, 2));
 
 console.log(`\n📄 报告已输出:`);
 console.log(` ${resolve(__dirname, 'audit-report.md')}`);
 console.log(` ${resolve(__dirname, 'audit-report.json')}`);
 
 // 如果有失败，exit code 1（方便 CI）
 process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });

