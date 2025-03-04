import { serverURL } from "../config";
import { decrypt } from "../utils/crypto";

import Client from "wsnet-client";

export default function createClient(setData, selectedChat) {
  return () => {
    const client = new Client(serverURL);

    client.onSay("message", ({ chatId, message, messageId }) => {
      setData((old) => {
        let messageData;
        try {
          messageData = {
            ...JSON.parse(decrypt(old[chatId].password, message)),
            id: messageId,
          };

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
          messageData = { type: "error", data: "wrong key\n" + error };
        }

        if (messageData.type == "delete") {
          let messages = old[chatId].messages.filter(
            (m) => m.id !== messageData.id
          );
          return {
            ...old,
            [chatId]: {
              ...old[chatId],
              messages,
            },
          };
        }
        return {
          ...old,
          [chatId]: {
            ...old[chatId],
            messages: [...old[chatId].messages, messageData],
            unread: chatId == selectedChat ? 0 : old[chatId].unread + 1,
          },
        };
      });
    });

    return client;
  };
}
