// 扫 dist/ 目录生成 sitemap.xml
// 在 astro build 之后运行：node scripts/generate-sitemap.cjs
const fs = require('fs');
const path = require('path');

const SITE = 'https://jsonversal.com';
const DIST = path.join(__dirname, '..', 'dist');

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
      // Use file mtime as lastmod (UTC, YYYY-MM-DD)
      const lastmod = stat.mtime.toISOString().slice(0, 10);
      // Priority based on URL depth: homepage=1.0, /tools/=0.9, /tools/foo=0.8, others=0.6
      const depth = url.split('/').filter(Boolean).length;
      const priority = depth === 0 ? '1.0' : depth === 1 ? '0.9' : depth === 2 ? '0.8' : '0.6';
      results.push({ url, lastmod, priority });
    }
  }
  return results;
}

const entries = walk(DIST).sort((a, b) => a.url.localeCompare(b.url));

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries.map(e => `  <url><loc>${SITE}${e.url}</loc><lastmod>${e.lastmod}</lastmod><priority>${e.priority}</priority></url>`),
  '</urlset>',
  '',
].join('\n');

fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml);
console.log(`sitemap.xml: ${entries.length} URLs -> dist/sitemap.xml`);
