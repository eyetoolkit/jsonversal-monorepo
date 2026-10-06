#!/usr/bin/env node
/**
 * inject-about.mjs — 把 tools/geo-gen/about/*.json 里的说明正文注入各工具页。
 *
 * 用法：node tools/geo-gen/inject-about.mjs [--dry]
 *
 * 设计要点：
 *  1. 正文内容集中在 JSON 文件里，便于批量校对、A/B 改写、跨页复用。
 *  2. 注入点是 <ToolPage ...> 开标签的属性区末尾（不在引号内的第一个 `>`）。
 *  3. 已经注入过 about 的页面默认跳过，加 --force 可覆盖。
 *  4. 值序列化成多行 JS 数组字面量（Astro frontmatter 里是合法表达式），
 *     字符串由 JSON.stringify 负责转义引号与反斜杠。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PAGES = path.join(ROOT, 'apps/main/src/pages');
const ABOUT_DIR = path.join(__dirname, 'about');

const dry = process.argv.includes('--dry');
const force = process.argv.includes('--force');

/** 收集 about/*.json 里的所有映射 */
function loadAll() {
  const map = new Map();
  if (!fs.existsSync(ABOUT_DIR)) return map;
  for (const f of fs.readdirSync(ABOUT_DIR).sort()) {
    if (!f.endsWith('.json')) continue;
    const raw = JSON.parse(fs.readFileSync(path.join(ABOUT_DIR, f), 'utf8'));
    for (const [route, sections] of Object.entries(raw)) {
      if (map.has(route)) console.warn(`  ! 重复路由 ${route}（${f}），后者覆盖前者`);
      map.set(route, sections);
    }
  }
  return map;
}

/** 把 [current, sections] 映射成 pages 目录下的绝对路径 */
function routeToFile(route) {
  const p = path.join(PAGES, route.replace(/^\/|\/$/g, ''), 'index.astro');
  return p;
}

/** 找到 <ToolPage ...> 属性区的结束位置（跳过引号内的 >） */
function findPropEnd(src, startIdx) {
  let quote = null;
  for (let i = startIdx; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '>') return i;
  }
  return -1;
}

/** 序列化成缩进好的 JS 数组字面量 */
function toLiteral(sections, indent) {
  const body = JSON.stringify(sections, null, 2)
    .split('\n')
    .map((l, i) => (i === 0 ? l : indent + l))
    .join('\n');
  return `about={${body}}`;
}

const map = loadAll();
console.log(`已加载 ${map.size} 个路由的正文（${ABOUT_DIR}）`);

let injected = 0, skipped = 0, missing = 0;

for (const [route, sections] of map) {
  const file = routeToFile(route);
  if (!fs.existsSync(file)) {
    console.warn(`  ! 找不到页面 ${route} -> ${file}`);
    missing++;
    continue;
  }
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes('about={') && !force) {
    console.log(`  - 跳过（已有 about） ${route}`);
    skipped++;
    continue;
  }
  if (src.includes('about={')) {
    // 覆盖模式：先删掉旧的 about={...} 属性（配对花括号）
    const idx = src.indexOf('about={');
    let depth = 0, end = -1;
    for (let i = idx + 'about='.length; i < src.length; i++) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (end > 0) src = src.slice(0, idx) + src.slice(end);
  }
  const tagIdx = src.indexOf('<ToolPage');
  if (tagIdx < 0) {
    console.warn(`  ! 未找到 <ToolPage> ${route}`);
    missing++;
    continue;
  }
  const propEnd = findPropEnd(src, tagIdx + '<ToolPage'.length);
  if (propEnd < 0) {
    console.warn(`  ! 无法定位属性区结束 ${route}`);
    missing++;
    continue;
  }
  const literal = toLiteral(sections, '  ');
  const next = src.slice(0, propEnd).replace(/\s*$/, '\n  ') + literal + '\n' + src.slice(propEnd);
  if (!dry) fs.writeFileSync(file, next, 'utf8');
  console.log(`  ${dry ? '[dry] 将写入' : '已写入'} ${route} (${sections.length} 节)`);
  injected++;
}

console.log(`\n合计：注入 ${injected}，跳过 ${skipped}，异常 ${missing}`);