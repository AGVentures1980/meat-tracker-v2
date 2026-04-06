const CACHE_NAME = 'brasa-os-v1-offline';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  // Standard Vite output structure, generic fallback if specific hashes fail
  '/manifest.json',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching App Shell...');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[Service Worker] Purging legacy cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests for offline caching. 
  // POST/PUT/DELETE are handled by our OfflineQueue in the UI layer.
  if (event.request.method !== 'GET') return;
  
  // Exclude API calls from Service Worker Cache (handled by App logic)
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it's a one-time-use stream
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Route standard dynamic UI assets to cache on the fly
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Exclude chrome-extension or strange protocols
                if (event.request.url.startsWith('http')) {
                   cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        ).catch(() => {
            // Fallback for navigation (SPA routing) if everything fails
            if (event.request.mode === 'navigate') {
                return caches.match('/index.html');
            }
        });
      })
  );
});
