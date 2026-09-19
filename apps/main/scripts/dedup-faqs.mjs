// scripts/dedup-faqs.mjs
// 去重 frontmatter 里重复的 const faqs = [...] 块
import fs from 'fs';
import path from 'path';

const ROOT = '/opt/jsonversal/apps/main/src/pages';
const TOOL_DIRS = ['tools', 'sec/tools', 'devops/tools', 'codegen/tools'];

function walk(dir, out=[]) {
  for (const e of fs.readdirSync(dir)) {
    const full = path.join(dir, e);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (e === 'index.astro') out.push(full);
  }
  return out;
}

function dedup(f) {
  const src = fs.readFileSync(f, 'utf8');
  const fmMatch = src.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return false;
  const fm = fmMatch[1];

  // 找所有 const faqs = [ ... ]; 出现的位置
  const startRe = /const\s+faqs\s*=\s*\[/g;
  let positions = [];
  let m;
  while ((m = startRe.exec(fm)) !== null) positions.push({start: m.index, idx: m.index});

  if (positions.length < 2) return false;

  // 从后往前删，保留第一个
  const spans = [];
  for (const pos of positions) {
    let i = startRe.lastIndex;
    // 注意 lastIndex 已经被正则 match 重置
  }
  // 用字符串匹配找每个 faqs 块的结束位置（配对 ] 计数 + 字符串跳过）
  const blocks = [];
  for (const pos of positions) {
    let i = fm.indexOf('[', pos);
    let depth = 0;
    let inStr = false, strCh = '';
    for (; i < fm.length; i++) {
      const ch = fm[i];
      if (inStr) {
        if (ch === '\\') { i++; continue; }
        if (ch === strCh) inStr = false;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strCh = ch; continue; }
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) {
          // 包含 ] 后面的 ; 空白
          while (i + 1 < fm.length && /[;\s]/.test(fm[i + 1])) i++;
          blocks.push({ start: pos, end: i + 1 });
          break;
        }
      }
    }
  }

  // 保留第一个块，删后面的
  let newFm = fm;
  for (let i = blocks.length - 1; i > 0; i--) {
    const b = blocks[i];
    newFm = newFm.slice(0, b.start) + newFm.slice(b.end);
    // 清理残留空行
    newFm = newFm.replace(/[ \t]*\n[ \t]*\n[ \t]*\n/g, '\n\n');
  }

  const newSrc = src.replace(fm, newFm);
  fs.writeFileSync(f, newSrc, 'utf8');
  return true;
}

let total = 0;
for (const sub of TOOL_DIRS) {
  for (const f of walk(path.join(ROOT, sub))) {
    if (dedup(f)) {
      console.log(`✅ ${f.replace(ROOT + '/', '')}`);
      total++;
    }
  }
}
console.log(`\n共修复 ${total} 个文件`);