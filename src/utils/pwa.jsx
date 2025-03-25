import { getSubscription } from "./notify.jsx";
let deferredPrompt;
const installBtn = document.getElementById("installBtn");

window.notificationSubscription = false;

window.addEventListener("beforeinstallprompt", (e) => {
  // Prevent the default prompt from being shown
  e.preventDefault();
  deferredPrompt = e;

  // Show the install button when the app is installable
  installBtn.style.display = "block";
});

installBtn.addEventListener("click", () => {
  // Show the install prompt when the button is clicked
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }
    deferredPrompt = null;
    installBtn.style.display = "none";
  });
});

export default function installApp() {
  if ("serviceWorker" in navigator) {
    // Handle the notification subscription (if applicable)
    getSubscription().then((s) => {
      window.notificationSubscription = s;
    });

    // Register the service worker
    navigator.serviceWorker
      .register("/easy-messenger/service-worker.js", {
        scope: "/easy-messenger/",
      })
      .then((registration) => {
        console.log("Service Worker Active!");

        // Check for updates every 5 minutes
        const updateInterval = setInterval(
          () => {
            registration
              .update()
              .then(() => {
                console.log("Service Worker updated!");
              })
              .catch((error) => {
                console.error(
                  "Error checking for service worker updates:",
                  error,
                );
              });
          },
          5 * 60 * 1000,
        ); // Check for updates every 5 minutes

        // Listen for the 'updatefound' event and handle the new service worker
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          installingWorker.onstatechange = () => {
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // A new service worker has been installed, trigger skipWaiting to update immediately
              installingWorker.postMessage({ type: "skipWaiting" });
              console.log("New service worker found and taking control");
            }
          };
        };

        // Cleanup the update interval when the component unmounts or service worker is registered
        return () => clearInterval(updateInterval);
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  }
}
