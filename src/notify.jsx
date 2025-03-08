import WEB_PUSH_PUBLIC_KEY from "../web-push-public-key.js";

const TIMEOUT = 5000; // Timeout in milliseconds (5 seconds)

export async function getSubscription() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.log("Push notifications are not supported in this browser.");
        return false;
    }

    const registration = await navigator.serviceWorker.ready;

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Operation timed out")), TIMEOUT)
    );

    try {
        // Race the timeout against the subscription retrieval process
        let subscription = await Promise.race([
            registration.pushManager.getSubscription(),
            timeoutPromise
        ]);

        if (subscription) {
            console.log("Returning existing subscription.");
            return subscription;
        }

        // If no subscription exists, create a new one
        console.log("Creating a new subscription...");

        subscription = await Promise.race([
            registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(WEB_PUSH_PUBLIC_KEY),
            }),
            timeoutPromise
        ]);

        return subscription;
    } catch (error) {
        console.error("Failed to get subscription:", error.message);
        return false;
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}
