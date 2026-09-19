import fs from 'fs';
const src = fs.readFileSync('/opt/jsonversal/apps/main/src/pages/tools/json-formatter/index.astro', 'utf8');
const fm = src.match(/^---\n([\s\S]*?)\n---/)[1];
// 显示 1985-2000 字符
console.log(fm.substring(1980, 2010));