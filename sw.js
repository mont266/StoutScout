// A unique name for our cache
const CACHE_NAME = 'stoutscout-v1';

// The list of files to cache on install
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/metadata.json',
  '/types.ts',
  '/constants.ts',
  '/App.tsx',
  '/components/Map.tsx',
  '/components/PubDetails.tsx',
  '/components/RatingForm.tsx',
  '/components/StarRating.tsx',
  '/components/FilterControls.tsx',
  '/components/PubList.tsx',
  '/components/Logo.tsx',
  '/components/SettingsModal.tsx',
  '/components/ProfilePage.tsx',
  '/components/XPPopup.tsx',
  '/storage.ts',
  '/utils.ts',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/icons/maskable_icon.svg',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
  'https://esm.sh/react@^19.1.0',
  'https://esm.sh/react-dom@^19.1.0/client',
  'https://esm.sh/@react-google-maps/api@^2.19.3'
];

// Install event: opens the cache and adds our files to it
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event: serves assets from cache if available, otherwise fetches from network
self.addEventListener('fetch', event => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // For Google Maps API and other external resources, always go to the network.
  if (event.request.url.startsWith('https://maps.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache - fetch from network, then cache and return
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // We don't cache everything, only certain paths.
                if (urlsToCache.includes(new URL(event.request.url).pathname) || urlsToCache.includes(event.request.url)) {
                   cache.put(event.request, responseToCache);
                }
              });

            return networkResponse;
          }
        );
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
