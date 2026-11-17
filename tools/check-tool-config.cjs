#!/usr/bin/env node
/**
 * 工具 config 一致性校验（定时新增工具 SOP 硬门禁）
 *
 * 用法：node tools/check-tool-config.cjs <slug1> [slug2 ...]
 *
 * 校验每个传入的 slug 是否同时出现在：
 *   1. packages/config/all-tools.js   的 href 里（全站搜索数据源）
 *   2. packages/config/tools-icons.js 的 ICONS 键里（emoji 磁贴）
 *
 * 任一缺失即 exit 1，SOP 据此中止、不推送。
 * 只校验本次传入的 slug，历史遗留页面的注册状态不受影响。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const slugs = process.argv.slice(2);

if (!slugs.length) {
  console.error('用法: node tools/check-tool-config.cjs <slug1> [slug2 ...]');
  process.exit(2);
}

const allToolsSrc = fs.readFileSync(path.join(ROOT, 'packages/config/all-tools.js'), 'utf8');
const iconsSrc = fs.readFileSync(path.join(ROOT, 'packages/config/tools-icons.js'), 'utf8');

// all-tools.js 的 href 形如 '/tools/json-diff/'、'/sec/tools/xxx/'，取最后一段为 slug
const hrefSlugs = new Set(
  [...allToolsSrc.matchAll(/href:\s*['"][^'"]*\/([a-z0-9][a-z0-9-]*)\/?['"]/g)].map(m => m[1])
);

// tools-icons.js 的 ICONS 键形如 'json-diff': '🧰'
const iconSlugs = new Set(
  [...iconsSrc.matchAll(/^\s*'([a-z0-9][a-z0-9-]*)'\s*:/gm)].map(m => m[1])
);

let missing = 0;
for (const slug of slugs) {
  const inHref = hrefSlugs.has(slug);
  const inIcon = iconSlugs.has(slug);
  const ok = inHref && inIcon;
  console.log(`${ok ? '✓' : '✗'} ${slug}  all-tools=${inHref ? 'ok' : 'MISSING'}  icons=${inIcon ? 'ok' : 'MISSING'}`);
  if (!ok) missing++;
}

console.log(`\nRESULT: ${slugs.length - missing}/${slugs.length} registered, ${missing} missing`);
process.exitCode = missing ? 1 : 0;
