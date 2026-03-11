/**
 * Service Worker for The Fulgidus Chronicles
 *
 * Caching strategies:
 *   - Cache-first: static assets (JS, CSS, fonts, images)
 *   - Stale-while-revalidate: HTML pages (navigations)
 *   - Network-only: analytics, third-party requests, Giscus
 *
 * Cache versioning: bump CACHE_VERSION on each deploy to purge stale caches.
 * The build timestamp is appended to make each build unique.
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const PAGE_CACHE = `pages-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

/**
 * Assets to pre-cache on install.
 * The offline fallback page must always be available.
 */
const PRECACHE_ASSETS = [
  OFFLINE_PAGE,
  '/manifest.webmanifest',
  '/img/logo.svg',
  '/favicon.svg',
];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Returns true for requests that should never be cached.
 * Includes analytics services, Giscus, and any third-party origin.
 */
function shouldSkip(url) {
  // Never cache non-http(s) schemes
  if (!url.protocol.startsWith('http')) return true;

  const hostname = url.hostname;

  // Skip analytics
  if (hostname.includes('umami.is')) return true;
  if (hostname.includes('google-analytics.com')) return true;
  if (hostname.includes('googletagmanager.com')) return true;
  if (hostname.includes('analytics')) return true;

  // Skip Giscus (comments iframe)
  if (hostname.includes('giscus.app')) return true;

  // Skip any third-party origin (not same-origin)
  if (url.origin !== self.location.origin) return true;

  return false;
}

/**
 * Returns true if the request is for a static asset.
 */
function isStaticAsset(url) {
  const path = url.pathname;
  return /\.(js|css|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|avif|ico|webmanifest)$/i.test(path) ||
    path.startsWith('/_astro/') ||
    path.startsWith('/fonts/') ||
    path.startsWith('/img/') ||
    path.startsWith('/pagefind/');
}

/**
 * Returns true if this is a navigation request (HTML page).
 */
function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

// ──────────────────────────────────────────────
// Install
// ──────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ──────────────────────────────────────────────
// Activate — clean up old caches
// ──────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, PAGE_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !currentCaches.includes(key))
            .map((key) => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ──────────────────────────────────────────────
// Fetch
// ──────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-only for skipped requests
  if (shouldSkip(url)) return;

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  if (isNavigationRequest(event.request)) {
    // Stale-while-revalidate for HTML pages
    event.respondWith(staleWhileRevalidate(event.request, PAGE_CACHE));
  } else if (isStaticAsset(url)) {
    // Cache-first for static assets
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
  }
  // For anything else (e.g. API calls), let the browser handle it normally
});

// ──────────────────────────────────────────────
// Caching strategies
// ──────────────────────────────────────────────

/**
 * Cache-first: return from cache if available, otherwise fetch and cache.
 * Does NOT cache opaque responses to avoid filling the cache quota.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Only cache successful same-origin responses (avoid opaque responses)
    if (response.ok && response.type !== 'opaque') {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // If fetch fails and we have no cache, return a basic error
    return new Response('Network error', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * Stale-while-revalidate: return cached version immediately if available,
 * then fetch an update in the background for next time.
 * If no cache and network fails, show the offline fallback page.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fetch update in background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok && response.type !== 'opaque') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // Return cached version immediately, or wait for network
  if (cached) {
    // Trigger background update but don't wait for it
    fetchPromise;
    return cached;
  }

  // No cache — must wait for network
  const networkResponse = await fetchPromise;
  if (networkResponse) return networkResponse;

  // Network failed and no cache — show offline fallback
  const offlinePage = await caches.match(OFFLINE_PAGE);
  if (offlinePage) return offlinePage;

  return new Response('You are offline', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// ──────────────────────────────────────────────
// Message handling
// ──────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Respond with list of cached page URLs for the offline page
  if (event.data && event.data.type === 'GET_CACHED_PAGES') {
    caches.open(PAGE_CACHE).then((cache) => {
      cache.keys().then((requests) => {
        const urls = requests
          .map((req) => req.url)
          .filter((url) => {
            const u = new URL(url);
            // Only include HTML pages, not assets
            return !isStaticAsset(u);
          });
        event.ports[0].postMessage({ cachedPages: urls });
      });
    });
  }
});
