export const serverURL =
  document.location.protocol == "http:"
    ? "ws://localhost:8080"
    : "wss://easy-messenger.onrender.com";
