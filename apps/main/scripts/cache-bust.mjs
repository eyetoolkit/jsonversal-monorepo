#!/usr/bin/env node
/**
 * 构建后自动 cache-bust：给 dist 里所有 HTML 的 /css/*.css 与 /js/*.js 引用
 * 追加 ?v=<内容 md5 前 8 位>。
 *
 * 为什么必须这么做：
 * Cloudflare Pages 对静态资源的浏览器 max-age 有 4 小时下限 —— 实测在 _headers
 * 里把 /js/* 写成 max-age=300、把图标写成 max-age=3600，回源响应一律被抬成
 * max-age=14400（只有 stale-while-revalidate 按配置生效）。所以"靠短缓存让改动
 * 快速生效"这条路在 Pages 上走不通，只能靠 URL 版本串让每次发布立即可见。
 *
 * Astro 自己的 /_astro/* 产物已带 content hash，不在处理范围内。
 *
 * 幂等：已存在的 ?v=xxx 会被替换为当前值，重复执行不会产生重复参数。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(appRoot, 'dist');

if (!fs.existsSync(distDir)) {
  console.error(`[cache-bust] 找不到构建产物目录: ${distDir}`);
  process.exit(1);
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(distDir);

// 1) 为所有非指纹化的手写资源算内容哈希
const assets = new Map();
for (const abs of files) {
  const rel = '/' + path.relative(distDir, abs).split(path.sep).join('/');
  if (/^\/css\/.+\.css$/.test(rel) || /^\/js\/.+\.js$/.test(rel)) {
    assets.set(rel, crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex').slice(0, 8));
  }
}

if (assets.size === 0) {
  console.error('[cache-bust] dist 中没有找到 /css/*.css 或 /js/*.js，疑似构建产物异常');
  process.exit(1);
}

// 2) 改写 HTML 引用（含已存在的 ?v=，保证幂等）
const htmlFiles = files.filter((f) => f.endsWith('.html'));
let touched = 0;
for (const f of htmlFiles) {
  const before = fs.readFileSync(f, 'utf8');
  let html = before;
  for (const [rel, v] of assets) {
    const esc = rel.replace(/[.*+?^${}()|[\]\\/]/g, (m) => '\\' + m);
    const re = new RegExp('((?:href|src)=["\']' + esc + ')(\\?[^"\']*)?(["\'])', 'g');
    html = html.replace(re, (_m, head, _query, quote) => `${head}?v=${v}${quote}`);
  }
  if (html !== before) {
    fs.writeFileSync(f, html);
    touched++;
  }
}

console.log(`[cache-bust] ${assets.size} 个资源已版本化，改写 ${touched}/${htmlFiles.length} 个 HTML`);
for (const [rel, v] of [...assets].sort()) console.log(`  ${rel}?v=${v}`);
