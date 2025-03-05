import { serverURL } from "../config";
import { decrypt, randomBytes } from "../utils/crypto";

import CryptoJS from "crypto-js";
import Client from "wsnet-client";

export default function createClient(setData, selectedChat, setSelectedChat) {
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
              messagesDiv.scrollHeight - messagesDiv.scrollTop < innerHeight
            ) {
              messagesDiv.lastChild?.scrollIntoView?.({
                behavior: "smooth",
                block: "center",
              });
            }
          }
        } catch (error) {
          messageData = { type: "error", data: "wrong key\n" + error.message };
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

    client.onSay("message-deleted", ({ chatId, messageId }) => {
      setData((old) => {
        let messages = old[chatId].messages.filter(
          (message) => message.id !== messageId
        );
        return {
          ...old,
          [chatId]: {
            ...old[chatId],
            messages,
          },
        };
      });
    });

    client.onSay("chat-deleted", ({ chatId }) => {
      setData((old) => {
        const newData = { ...old };
        delete newData[chatId];
        return newData;
      });
      setSelectedChat(null);
    });

    client.onSay("user-joined", ({ chatId, message }) => {
      setData((old) => {
        return {
          ...old,
          [chatId]: {
            ...old[chatId],
            messages: [
              ...old[chatId].messages,
              {
                type: "user-joined",
                data: "user joined: " + message,
                author: message,
                id: randomBytes(4).toString(CryptoJS.enc.Hex),
              },
            ],
          },
        };
      });
    });

    client.onSay("user-exited", ({ chatId, message }) => {
      setData((old) => {
        return {
          ...old,
          [chatId]: {
            ...old[chatId],
            messages: [
              ...old[chatId].messages,
              {
                type: "user-exited",
                data: "user exited: " + message,
                author: message,
                id: randomBytes(4).toString(CryptoJS.enc.Hex),
              },
            ],
          },
        };
      });
    });

    return client;
  };
}
