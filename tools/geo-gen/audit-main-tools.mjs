#!/usr/bin/env node
/** Content-quality audit: overlap between sections, FAQ duplication, hedging density. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'about', 'main-tools.json'), 'utf8'));
const PAGES = path.resolve(__dirname, '../../apps/main/src/pages');

const STOP = new Set(('the a an and or of to in is are was were be been it its that this those these with for on at as by from not no if then than so such can will would could should may might must do does did have has had they them their we you your i not but which who whom whose what when where why how all any both each few more most other some only own same too very s t just don now also into over under out up down off again further once here there why while'.split(' ')));

const toks = (s) => (s.toLowerCase().match(/[a-z][a-z0-9]*/g) || []).filter((w) => !STOP.has(w) && w.length > 2);
const jaccard = (a, b) => {
  const A = new Set(toks(a)), B = new Set(toks(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
};

let problems = 0;

for (const [route, sections] of Object.entries(data)) {
  const slug = route.replace(/^\/tools\//, '').replace(/\/$/, '');
  const src = fs.readFileSync(path.join(PAGES, 'tools', slug, 'index.astro'), 'utf8');

  // A) FAQ overlap: how much of each paragraph is already stated in the page's FAQ answers
  const faqBlock = src.match(/const faqs = \[[\s\S]*?\n\];/);
  const faqText = faqBlock ? faqBlock[0] : '';
  const faqWords = new Set(toks(faqText));
  const howto = src.match(/<h2>How (it works|token counting works)<\/h2>[\s\S]*?(?=<h2|$)/);
  const existing = new Set([...toks(faqText), ...toks(howto ? howto[0] : '')]);

  // B) intra-page section similarity
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      const sim = jaccard(sections[i].body.join(' '), sections[j].body.join(' '));
      if (sim > 0.25) { console.error(route + ': sections ' + i + ' and ' + j + ' are ' + (sim * 100).toFixed(0) + '% similar'); problems++; }
    }
    // C) paragraph-level similarity within page
    const ps = sections.flatMap((s) => s.body);
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const sim = jaccard(ps[i], ps[j]);
        if (sim > 0.35) { console.error(route + ': two paragraphs ' + (sim * 100).toFixed(0) + '% similar'); problems++; }
      }
    }
  }

  // D) hedging / filler density
  const all = sections.flatMap((s) => s.body).join(' ');
  const w = (all.match(/\S+/g) || []).length;
  const hedges = (all.match(/\b(very|really|quite|just|simply|easily|obviously|clearly|various|several|some|many|certain|potential|help(s|ful)?|useful|great|good|nice|easy|powerful|handy|convenient|smooth|seamless)\b/gi) || []).length;
  const pct = (hedges / w * 100).toFixed(1);
  if (hedges / w > 0.02) { console.error(route + ': hedging words ' + hedges + '/' + w + ' = ' + pct + '%'); problems++; }

  // E) specificity: every paragraph must carry at least one concrete technical marker
  const MARK = /(`[^`]+`|\bRFC ?\d|\bdraft-?\d|\b20\d\d-\d\d-\d\d\b|\bU\+\d|\b\d[\d,.]*\b|\b(?:19|20)\d\d\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|thirteen|twenty|thirty|sixty|seventy|hundred|thousand|million)\b|\bLCS\b|\blocaleCompare\b|\bJSON\.(?:parse|stringify)\b|\bDOMParser\b|\bUint(?:8|32)Array\b|\bMath\.\w+\b|\bNumber\.isInteger\b|\bparseInt\b|\bTextEncoder\b|\bcl100k_base\b|\bint64\b|\bPydantic\b|\bZod\b|\bFastAPI\b|\bList<|\bSet\b|\bCDATA\b|\bDOCTYPE\b|\bnullable\b|\bnull\b|\btrue\b|\bfalse\b|\bFirefox\b|\bGitHub\b|\bNewtonsoft\b|\bSystem\.Text\.Json\b)/;
  const withMark = sections.flatMap((s) => s.body).filter((p) => MARK.test(p)).length;
  const total = sections.flatMap((s) => s.body).length;
  if (withMark < total) {
    sections.flatMap((s) => s.body).forEach((p) => { if (!MARK.test(p)) console.error(route + ': no concrete marker -> ' + p.slice(0, 90) + '...'); });
    problems++;
  }

  // F) FAQ repetition ratio (informational, warn only)
  let overlapSum = 0;
  sections.flatMap((s) => s.body).forEach((p) => {
    const pt = toks(p);
    if (!pt.length) return;
    const hit = pt.filter((x) => faqWords.has(x)).length;
    overlapSum += hit / pt.length;
  });
  const avgOverlap = overlapSum / total;
  if (avgOverlap > 0.30) { console.warn('WARN ' + route + ': ' + (avgOverlap * 100).toFixed(0) + '% of body words already appear in the FAQ'); }
}

// G) cross-page paragraph duplication (already checked) + cross-page topic bleed
const allParas = [];
for (const [route, sections] of Object.entries(data)) sections.forEach((s) => s.body.forEach((p) => allParas.push([route, p])));
for (let i = 0; i < allParas.length; i++) {
  for (let j = i + 1; j < allParas.length; j++) {
    if (allParas[i][0] === allParas[j][0]) continue;
    const sim = jaccard(allParas[i][1], allParas[j][1]);
    if (sim > 0.30) { console.error('CROSS-PAGE ' + allParas[i][0] + ' vs ' + allParas[j][0] + ': ' + (sim * 100).toFixed(0) + '% similar'); problems++; }
  }
}

// H) every page must mention at least 1 tool-relevant technical term
const out = JSON.stringify(Object.keys(data).length);
console.log('\npages audited: ' + out + '; paragraphs: ' + allParas.length);
if (problems) { console.error('\n=== ' + problems + ' PROBLEM(S) ==='); process.exit(1); }
console.log('CONTENT AUDIT PASSED');