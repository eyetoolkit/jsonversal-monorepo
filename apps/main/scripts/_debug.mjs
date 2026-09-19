// debug: 看 faqs/howtos 抽取和 stripArray 后的效果
import fs from 'fs';
const src = fs.readFileSync('/opt/jsonversal/apps/main/src/pages/tools/json-formatter/index.astro', 'utf8');
const fm = src.match(/^---\n([\s\S]*?)\n---/)[1];

let processedFm = fm.replace(/import\s+BaseLayout[^;\n]*;?\s*\n?/g, '').replace(/import\s+ToolNav[^;\n]*;?\s*\n?/g, '').trim();

function stripArray(name) {
  const startRe = new RegExp('const\\s+' + name + '\\s*=\\s*\\[', 'g');
  let m;
  let iter = 0;
  while ((m = startRe.exec(processedFm)) !== null) {
    iter++;
    const startIdx = m.index;
    let depth = 0;
    let i = startRe.lastIndex;
    let inStr = false, strCh = '';
    console.log(`[${iter}] stripArray(${name}) start at ${startIdx}, peek next 5 chars: ${JSON.stringify(processedFm.slice(i, i+5))}`);
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
          console.log(`  found ] at ${i}, char after=${JSON.stringify(processedFm[i+1])}`);
          let skip = 0;
          while (i + 1 < processedFm.length && /[;,\s]/.test(processedFm[i + 1])) { i++; skip++; }
          console.log(`  skipped ${skip} chars, slice end at i=${i}, char after=${JSON.stringify(processedFm[i+1])}`);
          processedFm = processedFm.slice(0, startIdx) + processedFm.slice(i + 1);
            startRe.lastIndex = startIdx;
            console.log(`  after slice: context [startIdx-30 ... startIdx+30] = ${JSON.stringify(processedFm.slice(Math.max(0,startIdx-30), startIdx+30))}`);
            break;
        }
      }
    }
  }
}

console.log('=== Before ===');
console.log(processedFm.substring(0, 200));
console.log('---');
stripArray('faqs');
console.log('=== After faqs ===');
console.log(processedFm.substring(0, 200));
console.log('---');
stripArray('howtos');
console.log('=== After howtos ===');
console.log(processedFm.substring(0, 200));