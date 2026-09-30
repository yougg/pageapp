// PageApp Service Worker - 离线运行与静态资源缓存
const CACHE_NAME = 'pageapp-cache-v1';

// 核心预缓存资源列表
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './resources/css/theme.css',
  './resources/css/common.css',
  './resources/js/theme.js',
  './resources/js/pwa.js',
  './resources/js/jquery.min.js',
  './resources/js/conv-num.js',
  './resources/js/bilibili-player.js',
  './resources/icons/icon.svg',
  './resources/icons/icon-192.png',
  './resources/icons/icon-512.png',
  './resources/icons/icon-maskable.png',
  './conv-zh/',
  './conv-zh/index.html',
  './conv-zh/style.css',
  './conv-zh/dict-data.js',
  './conv-zh/convert.js',
  './conv-zh/app.js',
  './conv-num/',
  './conv-num/index.html',
  './json/',
  './json/index.html',
  './clock/',
  './clock/index.html',
  './bilibili-player/',
  './bilibili-player/index.html'
];

// 安装事件：预缓存全站核心静态资产，保持过程健壮容错
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 逐个添加缓存，避免单个资源失败导致整个缓存失败
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) => {
          return cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
            console.warn('[SW] 预缓存资源失败:', url, err);
          });
        })
      );
    })
  );
});

// 激活事件：清理旧缓存并接管所有客户端
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('pageapp-cache-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] 清理过期缓存:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// 抓取请求事件：Stale-While-Revalidate 策略
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 仅拦截 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 跨域资源直接放行（如 Disqus、Bilibili iframe 等）
  if (url.origin !== self.location.origin) {
    return;
  }

  // 静态同源资源响应策略：优先返回缓存，后台异步校验更新
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((error) => {
          console.warn('[SW] 网络请求失败，使用离线缓存:', request.url);
          // 若网络失败但已有缓存，将由 cachedResponse 兜底
          if (!cachedResponse) {
            throw error;
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
