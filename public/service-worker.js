const CACHE_NAME = "pwa-cache-v1";
const ASSETS = [
  // "/easy-messenger/",
  // "/easy-messenger/style.css",
  // "/easy-messenger/script.js",
  // "/easy-messenger/manifest.json",
  "/easy-messenger/img/logo-512.png",
  "/easy-messenger/img/logo-128.png",
  "/easy-messenger/img/logo-192.png",
];

// Install event - Pre-caches assets
self.addEventListener("install", (event) => {
  console.log("Service Worker Installed!");
  self.skipWaiting(); // Activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate event - Deletes old caches if they exist
self.addEventListener("activate", (event) => {
  console.log("Service Worker Activated!");
  event.waitUntil(self.clients.claim()); // Take control immediately
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


// Push notification event
self.addEventListener("push", function (event) {
  console.log("Push notification received:", event);

  const data = event.data ? event.data.text() : "New notification";
  let message = "'_'";

  if (data === "send") {
    message = "A user has sent a message (click to see)!";
  } else if (["delete-all-messages", "message-deleted", "chat-deleted"].includes(data)) {
    message = "A chat update has occurred.";
  } else {
    message = data;
  }

  const options = {
    body: message,
    icon: "https://manuelwestermeier.github.io/easy-messenger/img/logo-512.png",
  };

  event.waitUntil(
    self.registration.showNotification("Push Notification", options)
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (let client of clientList) {
        if (client.url.includes("/easy-messenger/") && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow("https://manuelwestermeier.github.io/easy-messenger/");
    })
  );
});
