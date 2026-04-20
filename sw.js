// ══════════════════════════════════════════════
// E-Max Loan Manager — Service Worker
// Offline caching for the shell, network-first for Supabase.
// Cache version bumped to v2 so existing installs pick up the
// additional modules (analytics, scanner, team) that were missing.
// ══════════════════════════════════════════════

const CACHE_NAME = 'emax-loans-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/enrollment.html',
  '/manifest.json',
  '/css/app.css',
  '/js/config.js',
  '/js/app.js',
  '/js/auth.js',
  '/js/calculator.js',
  '/js/loans.js',
  '/js/borrowers.js',
  '/js/payments.js',
  '/js/dashboard.js',
  '/js/reports.js',
  '/js/settings.js',
  '/js/analytics.js',
  '/js/scanner.js',
  '/js/team.js',
];

// Install: cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches so clients drop v1 and earlier
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for static shell, network-first for Supabase
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Supabase API — always hit the network; return a graceful offline payload
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Static shell — cache first, fall back to network, then index
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// Note: the earlier push listener was removed. E-Max does not run a push
// server, so no client will ever subscribe. Reminders are sent over
// WhatsApp via a wa.me/ deeplink the user taps from a loan card.
