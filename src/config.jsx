// in production or on https
const remoteServerURL = "wss://easy-messenger.onrender.com";
// in local debugging or on http
const localHostURL = "ws://localhost:8080";

export const serverURL =
  document.location.protocol == "http:" ? localHostURL : remoteServerURL;
