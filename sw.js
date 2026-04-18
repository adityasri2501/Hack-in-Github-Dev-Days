// sw.js — MediRoute Service Worker
const CACHE_NAME = 'mediroute-v2.0';
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/styles/components.css',
  '/styles/screens.css',
  '/js/app.js',
  '/js/state.js',
  '/js/api.js',
  '/js/voice.js',
  '/js/qr.js',
  '/js/i18n.js',
  '/js/screens/home.js',
  '/js/screens/triage.js',
  '/js/screens/doctors.js',
  '/js/screens/doctor-detail.js',
  '/js/screens/profile.js',
  '/js/screens/pharmacy.js',
  '/js/screens/prescription.js',
  '/js/screens/chat.js',
  '/js/screens/insurance.js',
  '/js/screens/history.js',
  '/data/doctors.json',
  '/data/translations.json',
  '/data/clinics.json',
  '/manifest.json'
];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching critical assets...');
      return cache.addAll(CRITICAL_ASSETS.map(url => new Request(url, { cache: 'reload' })))
        .catch(err => console.warn('[SW] Some assets failed to cache:', err));
    }).then(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip API calls — always network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // External CDN — network first with cache fallback
  if (!url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // App shell + static assets — cache first
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && (request.url.startsWith('http') || request.url.startsWith('https'))) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline fallback
    const fallback = await caches.match('/index.html');
    return fallback || new Response('MediRoute is offline. Please connect to the internet.', {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && (request.url.startsWith('http') || request.url.startsWith('https'))) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'Offline', message: 'Service unavailable offline' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ── Push Notifications ─────────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || { title: 'MediRoute', body: 'Medication reminder' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'mediroute-reminder',
      renotify: true,
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
