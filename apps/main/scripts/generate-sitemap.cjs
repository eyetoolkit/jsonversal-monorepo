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
      // 生成以 / 开头、结尾带 / 的路径（除根路径外）
      let url = base.split(path.sep).filter(Boolean).join('/');
      url = url === '' ? '/' : '/' + url + '/';
      results.push(url);
    }
  }
  return results;
}

const urls = walk(DIST).sort();

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`),
  '</urlset>',
  '',
].join('\n');

fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml);
console.log(`sitemap.xml: ${urls.length} URLs -> dist/sitemap.xml`);
