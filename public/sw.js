/* eslint-disable no-restricted-globals */
/**
 * Kill-switch Service Worker.
 *
 * 目的：把之前 vite-plugin-pwa 留下、卡在行動裝置上的舊 Service Worker 汰換掉，
 * 進站一次就：清光所有 Cache Storage、取消自己註冊、強制 reload 所有分頁。
 * 等所有使用者都跑過一次之後，這個檔案可以直接刪掉。
 */

self.addEventListener('install', (event) => {
  // 馬上取代舊 SW，不要等舊的閒置
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      // 1. 清光所有 Cache Storage
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (_) { /* ignore */ }

    try {
      // 2. 取得所有 client，等一下 reload 它們
      const clients = await self.clients.matchAll({ type: 'window' });

      // 3. 取消自己
      await self.registration.unregister();

      // 4. 強制每個開著的分頁重新載入，吃到不經 SW 的新版
      clients.forEach((client) => {
        try { client.navigate(client.url); } catch (_) { /* ignore */ }
      });
    } catch (_) { /* ignore */ }
  })());
});

// 所有 fetch 都直接走網路，避免再被舊快取污染
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => new Response('', { status: 504 })));
});
