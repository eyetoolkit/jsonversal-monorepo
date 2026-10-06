#!/usr/bin/env node
/** Self-check for about/main-tools.json */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, 'about', 'main-tools.json');
const PAGES = path.resolve(__dirname, '../../apps/main/src/pages');

const EXPECTED = [
  'json-diff', 'json-escape', 'json-schema-builder', 'json-schema-generator',
  'json-schema-sample-generator', 'json-sorter', 'json-statistics', 'json-to-csharp',
  'json-to-go', 'json-to-pydantic', 'json-to-typescript', 'json-to-zod',
  'jsonpath-tester', 'llm-token-calculator', 'markdown-preview', 'mock-data-generator',
  'text-diff', 'xml-formatter', 'yaml-formatter',
];

const BANNED = [
  "in today's fast-paced", 'whether you are a beginner', "whether you're a beginner",
  'unlock the power of', 'seamlessly', 'game-changer', 'game changer', 'delve',
  'it is important to note', "it's important to note", 'robust solution',
  'effortlessly', 'breathtaking', 'cutting-edge', 'seamless integration',
  'in the ever-evolving', 'unleash', 'empower', 'streamline your workflow',
  'best practices', 'whether you are', 'look no further', 'a testament to',
];

const raw = fs.readFileSync(FILE, 'utf8');
let data;
try { data = JSON.parse(raw); }
catch (e) { console.error('FAIL: JSON.parse error — ' + e.message); process.exit(1); }
console.log('JSON.parse: OK\n');

const wc = (s) => (s.trim().match(/\S+/g) || []).length;
const keys = Object.keys(data);
let problems = 0;
const rows = [];

// 1) exact key set
const expectedRoutes = EXPECTED.map((s) => '/tools/' + s + '/');
const missing = expectedRoutes.filter((r) => !keys.includes(r));
const extra = keys.filter((k) => !expectedRoutes.includes(k));
if (missing.length) { console.error('MISSING ROUTES: ' + missing.join(', ')); problems++; }
if (extra.length) { console.error('UNEXPECTED ROUTES: ' + extra.join(', ')); problems++; }

// 2) per-route checks
const seenParagraphs = new Map();
for (const route of expectedRoutes) {
  const sections = data[route];
  if (!Array.isArray(sections)) { console.error(route + ': not an array'); problems++; continue; }

  // directory name must match exactly
  const slug = route.replace(/^\/tools\//, '').replace(/\/$/, '');
  const dir = path.join(PAGES, 'tools', slug);
  if (!fs.existsSync(path.join(dir, 'index.astro'))) {
    console.error(route + ': no matching page directory ' + dir); problems++;
  }
  const currentProp = fs.readFileSync(path.join(dir, 'index.astro'), 'utf8')
    .match(/current="([^"]+)"/);
  if (!currentProp || currentProp[1] !== route) {
    console.error(route + ': page current= is ' + (currentProp && currentProp[1]) + ' (mismatch)'); problems++;
  }

  if (sections.length !== 3) { console.error(route + ': has ' + sections.length + ' sections (want 3)'); problems++; }

  let pageWords = 0;
  let minPara = Infinity, maxPara = 0, paraCount = 0;
  const headings = [];

  sections.forEach((s, si) => {
    if (typeof s.heading !== 'string' || !s.heading.trim()) { console.error(route + ' s' + si + ': bad heading'); problems++; }
    if (!Array.isArray(s.body) || s.body.length === 0) { console.error(route + ' s' + si + ': body must be non-empty array'); problems++; return; }
    // heading must be sentence case: first letter upper, and no Title Case (2+ later words capitalized)
    const h = s.heading || '';
    headings.push(h);
    const PROPER = /^(JSON|YAML|XML|CSS|HTML|RFC|UTF|LLM|Zod|CI|CD|GitHub|JavaScript|CommonMark|TypeScript|Newtonsoft|System\.Text\.Json|OpenAI|Anthropic|Kubernetes|CRLF|LF|Elasticsearch|IETF|WHATWG)$/;
    const laterWords = h.split(/\s+/).slice(1)
      .flatMap((w) => w.split('-'))            // "JavaScript-source" -> JavaScript, source
      .filter((w) => /^[A-Z]/.test(w) && !PROPER.test(w));
    if (laterWords.length) { console.error(route + ' s' + si + ': heading looks Title Case -> "' + h + '" (' + laterWords.join(', ') + ')'); problems++; }
    const generic = /^(introduction|conclusion|overview|faq|about|summary|notes?|description)$/i;
    if (generic.test(h.trim())) { console.error(route + ' s' + si + ': generic heading "' + h + '"'); problems++; }

    if (s.body.length < 2) { /* 3rd section may have 1 paragraph; allowed */ }
    s.body.forEach((p, pi) => {
      if (typeof p !== 'string') { console.error(route + ' s' + si + ' p' + pi + ': not a string'); problems++; return; }
      const n = wc(p);
      paraCount++;
      pageWords += n;
      minPara = Math.min(minPara, n);
      maxPara = Math.max(maxPara, n);
      if (n < 40) { console.error(route + ' s' + si + ' p' + pi + ': only ' + n + ' words (min 40)'); problems++; }
      if (n > 95) { console.error(route + ' s' + si + ' p' + pi + ': ' + n + ' words (over 90)'); problems++; }
      const low = p.toLowerCase();
      for (const b of BANNED) if (low.includes(b.toLowerCase())) { console.error(route + ' s' + si + ' p' + pi + ': banned phrase "' + b + '"'); problems++; }
      // duplicate paragraph detection (cross-page)
      const key = p.slice(0, 60).toLowerCase();
      if (seenParagraphs.has(key)) { console.error(route + ': paragraph duplicates ' + seenParagraphs.get(key)); problems++; }
      seenParagraphs.set(key, route);
    });
  });

  if (pageWords < 350 || pageWords > 500) { console.error(route + ': page words ' + pageWords + ' outside 350-500'); problems++; }
  if (headings.length !== new Set(headings.map((h) => h.toLowerCase())).size) { console.error(route + ': duplicate headings'); problems++; }

  rows.push({ route, sections: sections.length, words: pageWords, paras: paraCount, min: minPara, max: maxPara });
}

// 3) heading uniqueness across the whole file (no cross-page heading reuse)
const allHeadings = new Map();
for (const [route, sections] of Object.entries(data)) {
  for (const s of sections) {
    const k = s.heading.toLowerCase();
    if (allHeadings.has(k)) { console.error('heading reused: "' + s.heading + '" in ' + route + ' and ' + allHeadings.get(k)); problems++; }
    allHeadings.set(k, route);
  }
}

// 4) internal link mentions <= 2 per page
const SITE = ['JSON Diff','JSON Formatter','JSON Sorter','JSON Validator','JSON Schema Validator','JSON Escape','Text Diff','JSON Statistics','YAML Formatter','XML Formatter','Markdown Preview','Mock Data Generator','JSONPath Tester','JSON Schema Builder','JSON Schema Generator','LLM Token Calculator','JSON to Go','JSON to TypeScript','JSON to C#','JSON to Zod','JSON to Pydantic','JSON Schema Sample Generator','JSON Minify'];
for (const [route, sections] of Object.entries(data)) {
  const all = sections.flatMap((s) => s.body).join(' ');
  for (const name of SITE) {
    const c = (all.match(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (c > 2) { console.error(route + ': mentions "' + name + '" ' + c + ' times (max 2)'); problems++; }
  }
}

console.log('route'.padEnd(46) + 'sec  words  paras  min/max');
console.log('-'.repeat(72));
for (const r of rows) {
  console.log(r.route.padEnd(46) + String(r.sections).padStart(3) + String(r.words).padStart(8) + String(r.paras).padStart(7) + '  ' + r.min + '/' + r.max);
}
console.log('');
console.log('pages: ' + rows.length + '/' + EXPECTED.length);
console.log('total words: ' + rows.reduce((a, b) => a + b.words, 0));
if (problems) { console.error('\n=== ' + problems + ' PROBLEM(S) ==='); process.exit(1); }
console.log('\nALL CHECKS PASSED');