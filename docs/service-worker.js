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
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
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

// Check if the user has a good connection (Wi-Fi, 4G, 5G)
function hasGoodConnection() {
  if ("connection" in navigator) {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    return (
      connection.effectiveType === "4g" || connection.effectiveType === "wifi"
    );
  }
  return true; // Assume good connection if API isn't available
}

// Fetch event - Use cache if slow, update cache if fast
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cacheResponse) => {
      if (!hasGoodConnection()) {
        return cacheResponse || fetch(event.request); // Use cache first if slow connection
      }

      // Good connection: Try network first, then update cache
      return fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone()); // Update cache
            return networkResponse;
          });
        })
        .catch(() => cacheResponse || fetch(event.request)); // Fallback to cache if network fails
    })
  );
});
