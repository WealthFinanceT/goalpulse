const CACHE = 'goal-pulse-static-v6';
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/manifest.webmanifest?v=icons-b7d32ecd308c-70d5dec6971f-3c67a64317a2-c4daed634ebf',
  '/icon-192.png',
  '/icon-192.png?v=b7d32ecd308c',
  '/icon-512.png',
  '/icon-512.png?v=70d5dec6971f',
  '/icon-1024.png',
  '/icon-1024.png?v=3c67a64317a2',
  '/icon-512-maskable.png',
  '/icon-512-maskable.png?v=70d5dec6971f',
  '/apple-touch-icon.png',
  '/apple-touch-icon.png?v=c4daed634ebf'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('goal-pulse-static-') && key !== CACHE).map((key) => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html', { cacheName: CACHE })));
    return;
  }
  if (STATIC_ASSETS.some((asset) => new URL(asset, self.location.origin).pathname === url.pathname)) {
    event.respondWith(caches.match(request, { cacheName: CACHE }).then((cached) => cached || fetch(request)));
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const kinds = {
    goal: 'Goal update',
    kickoff: 'Kickoff reminder',
    'half-time': 'Half-time',
    'red-card': 'Red card',
    'full-time': 'Full-time result'
  };
  const kind = typeof payload.kind === 'string' && typeof kinds[payload.kind] === 'string' ? payload.kind : '';
  const title = typeof payload.title === 'string' ? payload.title.slice(0, 160) : 'Goal Pulse';
  const body = typeof payload.body === 'string'
    ? payload.body.slice(0, 200)
    : 'Open Goal Pulse to see the latest match updates.';
  const tag = typeof payload.tag === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(payload.tag)
    ? payload.tag
    : undefined;

  const image = typeof payload.image === 'string' && /^https:\/\/.{1,490}$/.test(payload.image)
    ? payload.image
    : undefined;
  event.waitUntil(self.registration.showNotification(kind ? `${kinds[kind]} · ${title}` : title, {
    body,
    icon: '/icon-192.png?v=b7d32ecd308c',
    badge: '/icon-192.png?v=b7d32ecd308c',
    image,
    tag,
    renotify: false,
    data: { url: typeof payload.url === 'string' ? payload.url : '/' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requestedPath = event.notification.data && typeof event.notification.data.url === 'string'
    ? event.notification.data.url
    : '/';
  const safePath = /^\/match\/[A-Za-z0-9_-]{1,100}$/.test(requestedPath) ? requestedPath : '/';
  const targetUrl = new URL(safePath, self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        if (client.url !== targetUrl && 'navigate' in client) await client.navigate(targetUrl);
        await client.focus();
        return;
      }
    }
    await self.clients.openWindow(targetUrl);
  })());
});
