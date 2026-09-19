import fs from 'fs';
const src = fs.readFileSync('src/pages/sec/tools/hash/index.astro', 'utf8');
const fm = src.match(/^---\n([\s\S]*?)\n---/)[1];
const m = fm.match(/const\s+faqs\s*=\s*(\[[\s\S]*?\];)/);
console.log('matched length:', m ? m[1].length : 0);
if (m) console.log('--- matched faqs ---\n' + m[1].substring(0, 300) + '\n---');