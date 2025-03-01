import { useClient } from "wsnet-client-react";
import Client from "wsnet-client";
import { useEffect } from "react";
import { serverURL } from "../config";
import { decrypt } from "../utils/crypto";

// Custom hook to handle the WebSocket client connection and incoming messages
export function useWsClient(data, setData) {
  const [client, state, reCreateClient, isClosed] = useClient(
    () => {
      const client = new Client(serverURL);

      client.onSay("message", ({ id, message }) => {
        setData((old) => {
          let messageData;
          try {
            messageData = JSON.parse(decrypt(old[id].password, message));

            const messagesDiv = document.querySelector(".messages");
            if (messagesDiv && messageData.type != "delete") {
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
            messageData = { type: "error", data: "wrong key\n" + error };
          }
          if (messageData.type == "delete") {
            let messages = old[id].messages.filter(
              (m) => m.id !== messageData.id
            );
            return {
              ...old,
              [id]: {
                ...old[id],
                messages,
              },
            };
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

  return {
    data,
    setData,
    client,
    state,
    reCreateClient,
    isClosed,
  };
}
