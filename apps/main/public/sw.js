/**
 * jsonversal Service Worker
 * 缓存策略：
 *   - HTML（页面）：network-first，fallback cache，offline fallback /offline.html
 *   - 静态资源（_astro/、fonts/、vendor/、favicon）：cache-first
 *   - 字体：cache-first，永不过期（自托管，体积固定）
 *
 * 版本号变更时旧缓存自动失效
 */
const VERSION = 'versal-v1.0.0-2026-09-18';
const STATIC_CACHE = `${VERSION}-static`;
const HTML_CACHE = `${VERSION}-html`;

const STATIC_ASSETS = [
  '/fonts/Geist-Variable.woff2',
  '/fonts/Geist-Italic-Variable.woff2',
  '/fonts/GeistMono-Variable.woff2',
  '/fonts/GeistMono-Italic-Variable.woff2',
  '/favicon-main.svg',
  '/favicon-sec.svg',
  '/favicon-devops.svg',
  '/favicon-codegen.svg',
  '/og-image.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 跨域直接放过（应该没有，但防御一下）
  if (url.origin !== location.origin) return;

  // 字体：cache-first
  if (url.pathname.startsWith('/fonts/')) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // 静态资源（_astro/, favicon, og-image, vendor）：cache-first
  if (
    url.pathname.startsWith('/_astro/') ||
    url.pathname.startsWith('/vendor/') ||
    url.pathname.match(/\.(svg|png|jpg|jpeg|webp|ico|css|js|woff2?)$/)
  ) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // HTML（导航请求 + text/html）：network-first，fallback cache，fallback /offline.html
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirst(req, HTML_CACHE, '/offline.html'));
    return;
  }

  // 其他 GET 请求：stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req, STATIC_CACHE));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    return cached || Response.error();
  }
}

async function networkFirst(req, cacheName, offlinePath) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    const offline = await cache.match(offlinePath);
    if (offline) return offline;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const networkPromise = fetch(req).then((fresh) => {
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  }).catch(() => cached);
  return cached || networkPromise;
}