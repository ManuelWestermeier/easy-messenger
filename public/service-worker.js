const CACHE_NAME = "pwa-cache-v1";
const ASSETS = [
  // "/easy-messenger/",
  // "/easy-messenger/style.css",
  // "/easy-messenger/script.js",
  // "/easy-messenger/manifest.json",
  // "/easy-messenger/service-worker.json",
  "/easy-messenger/img/logo-512.png",
  "/easy-messenger/img/logo-128.png",
  "/easy-messenger/img/logo-192.png",
  "/easy-messenger/sounds/messager-ringtone.mp3",
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
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME) // Remove outdated cache
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim(); // Take control immediately
});

// Fetch event - Update cache when online, use cache when offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone()); // Update cache
          return networkResponse;
        });
      })
      .catch(() => caches.match(event.request)) // Use cache if offline
  );
});

// Push notification event
self.addEventListener("push", async function (event) {
  console.log("Push notification received:", event);

  const data = event.data ? event.data.text() : "send";
  let message = "'_'";

  if (data === "send") {
    message = "A user has sent a message (click to view)!";
  } else if (data === "call") {
    message = "You are getting called!";
  } else if (data === "delete-all-messages") {
    message = "All chat messages have been deleted.";
  } else if (data === "message-deleted") {
    message = "A message has been deleted.";
  } else if (data === "chat-deleted") {
    message = "A chat has been deleted.";
  } else {
    message = data;
  }

  // Check if the website is currently open and focused
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const isClientFocused = clients.some((client) => client.focused);

  if (!isClientFocused || data == "call") {
    const options = {
      body: message,
      icon: "https://manuelwestermeier.github.io/easy-messenger/img/logo-512.png",
      title: "New Message",
      tag: "message-notification",
      vibration: [200, 100, 200],
      sound:
        "https://manuelwestermeier.github.io/easy-messenger/sounds/messager-ringtone.mp3",
      renotify: true,
      silent: false,
      timestamp: Date.now(),
    };

    event.waitUntil(self.registration.showNotification(options.title, options));
  }
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
      return clients.openWindow(
        "https://manuelwestermeier.github.io/easy-messenger/"
      );
    })
  );
});

// Listen for the update event to ensure the new service worker takes control immediately
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
