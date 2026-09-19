// scripts/refactor-tool-page.mjs
// 一次性把现有工具页从 BaseLayout+ToolNav+面包屑 模式改为 ToolPage 包装
// 不改业务 JS、不改表单结构，只动 frontmatter 和外壳

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../src/pages');

const TOOL_DIRS = ['tools', 'sec/tools', 'devops/tools', 'codegen/tools'];

// 不同站映射到 current 前缀和 site 名
const SITE = {
  tools: { prefix: '/tools/', site: 'main', section: 'tools' },
  sec:   { prefix: '/sec/tools/', site: 'sec', section: 'sec' },
  devops:{ prefix: '/devops/tools/', site: 'devops', section: 'devops' },
  codegen:{ prefix: '/codegen/tools/', site: 'codegen', section: 'codegen' },
};

function detectSection(filePath) {
  if (filePath.includes('/sec/tools/')) return SITE.sec;
  if (filePath.includes('/devops/tools/')) return SITE.devops;
  if (filePath.includes('/codegen/tools/')) return SITE.codegen;
  return SITE.tools;
}

function refactor(filePath) {
  const src = readFileSync(filePath, 'utf8');
  if (src.includes('ToolPage')) return { skipped: true, reason: 'already migrated' };

  const section = detectSection(filePath);
  const slug = filePath.split('/').slice(-2, -1)[0]; // 倒数第2段
  const current = section.prefix + slug + '/';
  const canonical = 'https://jsonversal.com' + current;

  // 提取 frontmatter 中的 title / description / keywords / faqs / howtos
  const fmMatch = src.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return { skipped: true, reason: 'no frontmatter' };

  let fm = fmMatch[1];

  // 如果 frontmatter 里还有 import BaseLayout / ToolNav 则保留（防止漏掉自定义）
  const hasBaseLayoutImport = /import\s+BaseLayout/.test(fm);
  const hasToolNavImport = /import\s+ToolNav/.test(fm);
  if (!hasBaseLayoutImport) return { skipped: true, reason: 'no BaseLayout import' };

  // 抽 title
  const titleMatch = fm.match(/const\s+title\s*=\s*['"`]([^'"`]+)['"`]/);
  if (!titleMatch) return { skipped: true, reason: 'no title const' };
  const title = titleMatch[1];

  // 抽 description
  const descMatch = fm.match(/const\s+description\s*=\s*['"`]([\s\S]*?)['"`]/);
  if (!descMatch) return { skipped: true, reason: 'no description const' };
  const description = descMatch[1];

  // 抽 keywords (数组字面量)
  const kwMatch = fm.match(/keywords\s*=\s*\{?\[([\s\S]*?)\]\}?\s*(?=\n\s*[a-zA-Z]|\n\s*\})/);
  let keywords = '[]';
  if (kwMatch) {
    // 完整保留数组
    const fullKwMatch = fm.match(/keywords\s*=\s*(\[[\s\S]*?\])/);
    keywords = fullKwMatch ? fullKwMatch[1] : '[]';
  }

  // 抽 faqs (整个数组字面量)
  const faqsMatch = fm.match(/const\s+faqs\s*=\s*(\[[\s\S]*?\];)/);
  const faqs = faqsMatch ? faqsMatch[1] : null;

  // 抽 howtos
  const howtosMatch = fm.match(/const\s+howtos\s*=\s*(\[[\s\S]*?\];)/);
  const howtos = howtosMatch ? howtosMatch[1] : null;

  // 构建新的 frontmatter
  let newFm = '';
  newFm += `import ToolPage from '@versal/ui/ToolPage.astro';\n`;
  newFm += `\n`;
  newFm += `const title = ${JSON.stringify(title)};\n`;
  newFm += `const description = ${JSON.stringify(description)};\n`;
  if (faqs) newFm += `const faqs = ${faqs.replace(/^const\s+faqs\s*=\s*/, '')}\n`;
  if (howtos) newFm += `const howtos = ${howtos.replace(/^const\s+howtos\s*=\s*/, '')}\n`;

  // 构建新的 <ToolPage>
  let toolPage = `<ToolPage\n`;
  toolPage += `  site="${section.site}"\n`;
  toolPage += `  title={title}\n`;
  toolPage += `  description={description}\n`;
  toolPage += `  canonical="${canonical}"\n`;
  toolPage += `  current="${current}"\n`;
  if (keywords !== '[]') toolPage += `  keywords=${keywords}\n`;
  if (faqs) toolPage += `  faqs={faqs}\n`;
  if (howtos) toolPage += `  howtos={howtos}\n`;
  toolPage += `>\n`;

  // 提取原 <BaseLayout ...> ... </BaseLayout> 之间的 body
  // 简化：找到 <BaseLayout 开始标签的位置到 </BaseLayout> 结束标签之间的内容
  const baseLayoutStart = src.indexOf('<BaseLayout');
  const baseLayoutEnd = src.indexOf('</BaseLayout>');
  if (baseLayoutStart < 0 || baseLayoutEnd < 0) return { skipped: true, reason: 'no BaseLayout pair' };

  // 找 > 关闭 BaseLayout 开始标签
  const startCloseIdx = src.indexOf('>', baseLayoutStart) + 1;
  let body = src.slice(startCloseIdx, baseLayoutEnd);

  // 删除 ToolNav 标签（含 <ToolNav ... />）
  body = body.replace(/<ToolNav[^>]*\/?>\s*\n?/g, '');
  // 删除独立的面包屑导航块（nav class="crumbs"）
  body = body.replace(/<nav\s+aria-label=["']Breadcrumb["']\s+class=["']crumbs["']>[\s\S]*?<\/nav>\s*\n?/g, '');
  // 删除 <h1>{title}</h1>（会由 ToolPage 自动注入）
  body = body.replace(/<h1>\{title\}<\/h1>\s*\n?/g, '');
  // 删除 <p class="text-muted">{description}</p>（会由 ToolPage 自动注入）
  body = body.replace(/<p\s+class=["']text-muted["']>\{description\}<\/p>\s*\n?/g, '');

  // 重组
  const before = src.slice(0, fmMatch.index);
  const after = src.slice(baseLayoutEnd + '</BaseLayout>'.length);
  // after 通常包含 <style> <script> 块

  // 修正 frontmatter import 清理（去掉 BaseLayout / ToolNav import）
  const oldFm = fmMatch[1];
  let cleanedFm = oldFm
    .replace(/import\s+BaseLayout[^;\n]*;?\s*\n?/g, '')
    .replace(/import\s+ToolNav[^;\n]*;?\s*\n?/g, '')
    .trim();

  // 把清理后的旧 fm（去掉 title/description/keywords/faqs/howtos 后的其他定义）放回
  let preservedFm = '';
  // 我们已经在 newFm 里重建了 title/description/faqs/howtos，需要保留的可能是 import 其他包、token 等
  // 关键：用"块"为单位，遇到 faqs/howtos 开头则整块跳过；其他跳过单行即可
  // 实现：先在 cleanedFm 里把 const faqs = [...] 和 const howtos = [...] 整段移除（精确匹配括号配对）
  let processedFm = cleanedFm;
  function stripArray(name) {
    // 匹配 `const <name> = [` 直到配对的 `]`，跳过字符串和嵌套花括号
    const startRe = new RegExp('const\\s+' + name + '\\s*=\\s*\\[', 'g');
    let m;
    while ((m = startRe.exec(processedFm)) !== null) {
      const startIdx = m.index;
      let depth = 0;
      let i = startRe.lastIndex;
      let inStr = false, strCh = '';
      for (; i < processedFm.length; i++) {
        const ch = processedFm[i];
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
              // 找到匹配的 `]`，向后跳过 ; 逗号 和 空白
              while (i + 1 < processedFm.length && /[;,\s]/.test(processedFm[i + 1])) i++;
              processedFm = processedFm.slice(0, startIdx) + processedFm.slice(i + 1);
              startRe.lastIndex = startIdx;
              break;
            }
        }
      }
    }
  }
  stripArray('faqs');
  stripArray('howtos');

  // 然后单独行移除 title / description / canonical 赋值
  processedFm = processedFm
    .replace(/^const\s+title\s*=.*$/gm, '')
    .replace(/^const\s+description\s*=.*$/gm, '')
    .replace(/^canonical\s*=.*$/gm, '');

  // 清理多余空行
  preservedFm = processedFm.replace(/\n{3,}/g, '\n\n').trim();

  const finalFm = '---\n' + newFm + (preservedFm ? '\n' + preservedFm : '') + '\n---';

  const newSrc = before + finalFm + '\n\n' + toolPage + body + '</ToolPage>' + after;

  writeFileSync(filePath, newSrc, 'utf8');
  return { migrated: true, slug };
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (entry === 'index.astro') {
      out.push(full);
    }
  }
  return out;
}

let migrated = 0, skipped = 0;
const skipReasons = {};
for (const sub of TOOL_DIRS) {
  const root = join(SRC, sub);
  for (const file of walk(root)) {
    const result = refactor(file);
    if (result.migrated) {
      migrated++;
      console.log(`✅ ${file.replace(SRC + '\\', '')}`);
    } else {
      skipped++;
      skipReasons[result.reason] = (skipReasons[result.reason] || 0) + 1;
    }
  }
}

console.log(`\n=== 完成 ===`);
console.log(`迁移: ${migrated}`);
console.log(`跳过: ${skipped}`);
console.log('跳过原因:', skipReasons);