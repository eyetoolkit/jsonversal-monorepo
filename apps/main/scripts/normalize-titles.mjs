// scripts/normalize-titles.mjs
// 轻量清理：去掉 Title 中的 " — Online, Free" / " — Free" 等重复营销词
import fs from 'fs';
import path from 'path';

const ROOT = '/opt/jsonversal/apps/main/src/pages';
const DIRS = ['tools', 'sec/tools', 'devops/tools', 'codegen/tools'];

let changed = 0;
for (const d of DIRS) {
  const dir = path.join(ROOT, d);
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f, 'index.astro');
    if (!fs.existsSync(full)) continue;
    let src = fs.readFileSync(full, 'utf8');
    const orig = src;
    // 去掉重复的营销词
    src = src.replace(/ — Online, Free/g, '');
    src = src.replace(/ — Free/g, '');
    src = src.replace(/, Free\b/g, '');
    src = src.replace(/ Free$/gm, '');  // 行末孤立的 "Free"
    // 规范化 em-dash 周围的空格（部分文件前后空格不一致）
    src = src.replace(/— /g, ' — ');
    if (src !== orig) {
      fs.writeFileSync(full, src, 'utf8');
      changed++;
      console.log(`✅ ${path.relative(ROOT, full)}`);
    }
  }
}
console.log(`\n共清理 ${changed} 个文件`);