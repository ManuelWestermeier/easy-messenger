const CACHE_NAME = "pwa-cache-v1";
const ASSETS = [
  // "/easy-messenger/",
  // "/easy-messenger/style.css",
  // "/easy-messenger/script.js",
  // "/easy-messenger/manifest.json",
  // "/easy-messenger/img/logo-512.png",
  // "/easy-messenger/img/logo-128.png",
];

// Install event - Pre-caches assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate event - Deletes old caches if they exist
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME) // Remove outdated cache
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Fetch event - Serve from cache, update in the background
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cacheResponse) => {
      return (
        cacheResponse ||
        fetch(event.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone()); // Update cache
            return networkResponse;
          });
        })
      );
    })
  );
});
