// 扫 dist/ 目录生成 sitemap（多文件 + sitemap index）
// 输出：
//   dist/sitemap.xml          （index，引用所有子 sitemap）
//   dist/sitemap-main.xml     （首页 + /tools/）
//   dist/sitemap-sec.xml      （/sec/ + /sec/tools/）
//   dist/sitemap-devops.xml   （/devops/ + /devops/tools/）
//   dist/sitemap-codegen.xml  （/codegen/ + /codegen/tools/）
//   dist/sitemap-legal.xml    （/privacy/ + /terms/ + /licenses/ + /404 + /offline.html）
//
// 在 astro build 之后运行：node scripts/generate-sitemap.cjs
const fs = require('fs');
const path = require('path');

const SITE = 'https://jsonversal.com';
const DIST = path.join(__dirname, '..', 'dist');

// 按栏自分组的桶
const BUCKETS = {
  main:    { file: 'sitemap-main.xml',    label: 'main',   match: (url) => url === '/' || url.startsWith('/tools/') },
  sec:     { file: 'sitemap-sec.xml',     label: 'sec',    match: (url) => url.startsWith('/sec/') },
  devops:  { file: 'sitemap-devops.xml',  label: 'devops', match: (url) => url.startsWith('/devops/') },
  codegen: { file: 'sitemap-codegen.xml', label: 'codegen',match: (url) => url.startsWith('/codegen/') },
  compare: { file: 'sitemap-compare.xml', label: 'compare', match: (url) => url.startsWith('/compare/') },
  legal:   { file: 'sitemap-legal.xml',   label: 'legal',  match: (url) => ['/privacy/', '/terms/', '/licenses/', '/404', '/offline.html'].includes(url) },
};

function walk(dir, base = '') {
  const results = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(...walk(full, path.join(base, name)));
    } else if (name === 'index.html') {
      let url = base.split(path.sep).filter(Boolean).join('/');
      url = url === '' ? '/' : '/' + url + '/';
      // /404.html -> /404 (no trailing slash)；/offline.html -> /offline.html
      if (base === '404.html' || base === 'offline.html') url = '/' + base;
      const lastmod = stat.mtime.toISOString().slice(0, 10);
      const depth = url.split('/').filter(Boolean).length;
      const priority = url === '/' ? '1.0'
        : depth === 1 ? '0.9'
        : depth === 2 ? (url.endsWith('/tools/') || url.endsWith('/sec/') || url.endsWith('/devops/') || url.endsWith('/codegen/') ? '0.8' : '0.7')
        : '0.6';
      results.push({ url, lastmod, priority });
    }
  }
  return results;
}

const allEntries = walk(DIST).sort((a, b) => a.url.localeCompare(b.url));

// 分桶
const buckets = {};
for (const k of Object.keys(BUCKETS)) buckets[k] = [];
for (const e of allEntries) {
  for (const k of Object.keys(BUCKETS)) {
    if (BUCKETS[k].match(e.url)) { buckets[k].push(e); break; }
  }
}

function writeSitemap(filename, entries) {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(e => `  <url><loc>${SITE}${e.url}</loc><lastmod>${e.lastmod}</lastmod><priority>${e.priority}</priority></url>`),
    '</urlset>',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(DIST, filename), xml);
}

for (const k of Object.keys(BUCKETS)) {
  writeSitemap(BUCKETS[k].file, buckets[k]);
}

// Sitemap index
const indexXml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...Object.entries(BUCKETS).map(([k, b]) => `  <sitemap><loc>${SITE}/${b.file}</loc><lastmod>${new Date().toISOString().slice(0,10)}</lastmod></sitemap>`),
  '</sitemapindex>',
  '',
].join('\n');
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), indexXml);

console.log(`sitemap.xml (index): ${Object.keys(BUCKETS).length} sub-sitemaps`);
for (const k of Object.keys(BUCKETS)) {
  console.log(`  ${BUCKETS[k].file}: ${buckets[k].length} URLs`);
}
console.log(`Total: ${allEntries.length} URLs`);