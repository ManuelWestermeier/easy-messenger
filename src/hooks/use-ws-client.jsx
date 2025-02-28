import { useClient } from "wsnet-client-react";
import Client from "wsnet-client";
import { useEffect } from "react";
import { decrypt } from "../utils/crypto";
import useLocalStorage from "use-local-storage";

// Custom hook to handle the WebSocket client connection and incoming messages
export function useWsClient() {
  const [data, setData] = useLocalStorage("enc-chat-data", {});

  const [client, state, reCreateClient, isClosed] = useClient(
    () => {
      const client = new Client(
        document.location.protocol == "http:"
          ? "ws://localhost:8080"
          : "wss://easy-messenger.onrender.com"
      );

      client.onSay("message", ({ id, message }) => {
        setData((old) => {
          let messageData;
          try {
            messageData = JSON.parse(decrypt(old[id].password, message));

            const messagesDiv = document.querySelector(".messages");
            if (messagesDiv) {
              if (
                messagesDiv.scrollTop == 0 ||
                messagesDiv.scrollTop == messagesDiv.scrollHeight
              ) {
                messagesDiv.lastChild?.scrollIntoView?.({
                  behavior: "smooth",
                  block: "center",
                });
              }
            }
          } catch (error) {
            messageData = { type: "error", data: "wrong key" };
          }
          return {
            ...old,
            [id]: {
              ...old[id],
              messages: [...old[id].messages, messageData],
            },
          };
        });
      });

      return client;
    },
    true,
    true
  );

  useEffect(() => {
    if (!client) return;
    for (const chatId in data) client.get("join", chatId);
  }, [client]);

  return { data, setData, client, state, reCreateClient, isClosed };
}
