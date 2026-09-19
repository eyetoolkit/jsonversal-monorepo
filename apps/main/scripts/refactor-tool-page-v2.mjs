// scripts/refactor-tool-page-v2.mjs
// 完全重写：不依赖 stripArray，直接基于正则切割

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../src/pages');

const TOOL_DIRS = ['tools', 'sec/tools', 'devops/tools', 'codegen/tools'];

const SITE = {
  tools: { prefix: '/tools/', site: 'main' },
  sec:   { prefix: '/sec/tools/', site: 'sec' },
  devops:{ prefix: '/devops/tools/', site: 'devops' },
  codegen:{ prefix: '/codegen/tools/', site: 'codegen' },
};

function detectSection(filePath) {
  if (filePath.includes('/sec/tools/')) return SITE.sec;
  if (filePath.includes('/devops/tools/')) return SITE.devops;
  if (filePath.includes('/codegen/tools/')) return SITE.codegen;
  return SITE.tools;
}

/** 计算 const NAME = [...] 的精确结束位置（返回 slice 末尾 exclusive index）
 *  通过配对 [ ] 计数 + 字符串跳过实现
 */
function findArrayEnd(src, startIdx) {
  let i = src.indexOf('[', startIdx);
  if (i < 0) return -1;
  let depth = 0;
  let inStr = false, strCh = '';
  for (; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === strCh) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strCh = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function refactor(filePath) {
  const src = readFileSync(filePath, 'utf8');
  if (src.includes("import ToolPage from '@versal/ui/ToolPage.astro'")) return { skipped: true, reason: 'already migrated' };

  const section = detectSection(filePath);
  const slug = filePath.split('/').slice(-2, -1)[0];
  const current = section.prefix + slug + '/';
  const canonical = 'https://jsonversal.com' + current;

  const fmMatch = src.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return { skipped: true, reason: 'no frontmatter' };
  let fm = fmMatch[1];

  // 提取 title
  const titleMatch = fm.match(/const\s+title\s*=\s*['"`]([^'"`]+)['"`]/);
  if (!titleMatch) return { skipped: true, reason: 'no title const' };
  const title = titleMatch[1];

  // 提取 description
  const descMatch = fm.match(/const\s+description\s*=\s*['"`]([\s\S]*?)['"`]/);
  if (!descMatch) return { skipped: true, reason: 'no description const' };
  const description = descMatch[1];

  // 提取 keywords
  const kwMatch = fm.match(/keywords\s*=\s*(\[[\s\S]*?\])/);
  const keywords = kwMatch ? kwMatch[1] : null;

  // ===== 精确切割 frontmatter =====
  // 切掉 const faqs / const howtos（保留其他内容如 import、token 等）
  // 找到 const faqs = [...] 的精确位置并切除（连同尾部的 ; 和换行）

  function removeArray(fmStr, name) {
    const startRe = new RegExp('const\\s+' + name + '\\s*=\\s*\\[', 'g');
    let m;
    while ((m = startRe.exec(fmStr)) !== null) {
      const startIdx = m.index;
      const endIdx = findArrayEnd(fmStr, startIdx);
      if (endIdx < 0) continue;
      // 删除范围：[startIdx, endIdx+1) + 后面的 ; 和空白
      let cutEnd = endIdx + 1;
      while (cutEnd < fmStr.length && (fmStr[cutEnd] === ';' || /\s/.test(fmStr[cutEnd]))) {
        // 但只删到第一个换行为止，避免吃其他代码
        if (fmStr[cutEnd] === '\n') { cutEnd++; break; }
        cutEnd++;
      }
      // 注意：上面只删到第一个 \n（包含）
      fmStr = fmStr.slice(0, startIdx) + fmStr.slice(cutEnd);
      // 重新搜索
      startRe.lastIndex = startIdx;
    }
    return fmStr;
  }

  // 先抽出 faqs 和 howtos 用于 newFm
  let faqsForNew = null;
  {
    const m = fm.match(/const\s+faqs\s*=\s*\[/);
    if (m) {
      const end = findArrayEnd(fm, m.index);
      if (end > 0) {
        const arrText = fm.substring(m.index, end + 1);
        // 转换为独立可用的 const 声明
        faqsForNew = arrText;
      }
    }
  }
  let howtosForNew = null;
  {
    const m = fm.match(/const\s+howtos\s*=\s*\[/);
    if (m) {
      const end = findArrayEnd(fm, m.index);
      if (end > 0) {
        const arrText = fm.substring(m.index, end + 1);
        howtosForNew = arrText;
      }
    }
  }

  // 移除 fm 里的 faqs 和 howtos
  fm = removeArray(fm, 'faqs');
  fm = removeArray(fm, 'howtos');

  // 移除 title / description / canonical 单行声明
  fm = fm.replace(/^const\s+title\s*=.*$/gm, '');
  fm = fm.replace(/^const\s+description\s*=.*$/gm, '');

  // 清理多余空行
  fm = fm.replace(/\n{3,}/g, '\n\n').trim();

  // 构建 newFm
  let newFm = `import ToolPage from '@versal/ui/ToolPage.astro';\n\n`;
  newFm += `const title = ${JSON.stringify(title)};\n`;
  newFm += `const description = ${JSON.stringify(description)};\n`;
  if (faqsForNew) newFm += faqsForNew + ';\n';
  if (howtosForNew) newFm += howtosForNew + ';\n';

  // 拼接 frontmatter（newFm 在前，原 fm 其余内容在后）
  const finalFm = '---\n' + newFm + (fm ? fm + '\n' : '') + '---';

  // 构建 ToolPage
  let toolPage = `<ToolPage\n`;
  toolPage += `  site="${section.site}"\n`;
  toolPage += `  title={title}\n`;
  toolPage += `  description={description}\n`;
  toolPage += `  canonical="${canonical}"\n`;
  toolPage += `  current="${current}"\n`;
  if (keywords) toolPage += `  keywords=${keywords}\n`;
  if (faqsForNew) toolPage += `  faqs={faqs}\n`;
  if (howtosForNew) toolPage += `  howtos={howtos}\n`;
  toolPage += `>\n`;

  // 提取 <BaseLayout ...> ... </BaseLayout> body
  const baseLayoutStart = src.indexOf('<BaseLayout');
  const baseLayoutEnd = src.indexOf('</BaseLayout>');
  if (baseLayoutStart < 0 || baseLayoutEnd < 0) return { skipped: true, reason: 'no BaseLayout pair' };

  const startCloseIdx = src.indexOf('>', baseLayoutStart) + 1;
  let body = src.slice(startCloseIdx, baseLayoutEnd);

  // 清理 body 中的 ToolNav / 面包屑 / H1 / description
  body = body.replace(/<ToolNav[^>]*\/?>\s*\n?/g, '');
  body = body.replace(/<nav\s+aria-label=["']Breadcrumb["']\s+class=["']crumbs["']>[\s\S]*?<\/nav>\s*\n?/g, '');
  body = body.replace(/<h1>\{title\}<\/h1>\s*\n?/g, '');
  body = body.replace(/<p\s+class=["']text-muted["']>\{description\}<\/p>\s*\n?/g, '');

  const before = src.slice(0, fmMatch.index);
  const after = src.slice(baseLayoutEnd + '</BaseLayout>'.length);

  const newSrc = before + finalFm + '\n\n' + toolPage + body + '</ToolPage>' + after;
  writeFileSync(filePath, newSrc, 'utf8');
  return { migrated: true };
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry === 'index.astro') out.push(full);
  }
  return out;
}

let migrated = 0, skipped = 0;
for (const sub of TOOL_DIRS) {
  for (const f of walk(join(SRC, sub))) {
    const r = refactor(f);
    if (r.migrated) migrated++;
    else skipped++;
  }
}
console.log(`迁移: ${migrated}, 跳过: ${skipped}`);