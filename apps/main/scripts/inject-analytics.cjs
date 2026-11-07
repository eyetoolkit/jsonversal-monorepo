#!/usr/bin/env node
/**
 * inject-analytics.cjs — 构建后注入 CF Web Analytics beacon
 *
 * 在 astro build 之后, 对 dist 下全部 .html 统一注入 CF Web Analytics
 * beacon（第一方、无 cookie、免 GDPR 横幅）。放构建后注入而不是逐页
 * 改 95 个 .astro, 是因为 jsonversal 没有共享 layout, 逐页改的 diff
 * 太大；构建后注入只需 1 个脚本 + package.json 一行。
 *
 * Token 来源（按优先级）：
 *   1. env CF_WA_TOKEN_JSONVERSAL（CI secret / 本地 .env）
 *   2. 本文件下方 TOKEN 常量（兜底，避免 CI 漏配时静默无数据）
 *
 * 未配置有效 token 时：跳过注入并打印警告（不阻塞构建）。
 * 幂等：页面已含 data-cf-beacon 则跳过。
 */
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.CF_WA_TOKEN_JSONVERSAL || 'PASTE_JSONVERSAL_CF_WA_TOKEN_HERE';

const distDir = path.resolve(__dirname, '../dist');
const marker = 'data-cf-beacon';

function snippet() {
  return '<script defer src="https://static.cloudflareinsights.com/beacon.min.js"' +
    ' data-cf-beacon=\'{"token":"' + TOKEN + '"}\'></script>';
}

if (!fs.existsSync(distDir)) {
  console.log('   ⚠️  inject-analytics: dist/ 不存在，跳过');
  process.exit(0);
}

if (!TOKEN || TOKEN.startsWith('PASTE_')) {
  console.log('   ⚠️  inject-analytics: 未配置 token（env CF_WA_TOKEN_JSONVERSAL 或本文件 TOKEN 常量），跳过注入');
  process.exit(0);
}

let touched = 0, skipped = 0, total = 0;
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(p); continue; }
    if (!p.endsWith('.html')) continue;
    total++;
    let html = fs.readFileSync(p, 'utf8');
    if (html.includes(marker)) { skipped++; continue; }
    const next = html.replace(/(<\/head>)/i, snippet() + '\n$1');
    if (next !== html) { fs.writeFileSync(p, next); touched++; }
  }
})(distDir);

console.log(`   🔢 inject-analytics: ${touched} 页注入 CF Web Analytics, ${skipped} 已含跳过, 共 ${total} html`);
