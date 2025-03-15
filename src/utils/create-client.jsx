import { serverURL } from "../config";
import { decrypt, randomBytes } from "../utils/crypto";

import CryptoJS from "crypto-js";
import Client from "wsnet-client";

export default function createClient(setData) {
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

          if (messageData.type == "update") {
            const [editMsgId, type, value] = messageData.data;
            const editMsgIndex = old[chatId].messages.findIndex(
              ({ id }) => id == editMsgId
            );

            if (editMsgIndex == -1) return old;

            if (type == "comment") {
              old[chatId].messages[editMsgIndex].comments.push(value);
            }
          } else {
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
          }
        } catch (error) {
          messageData = { type: "error", data: "wrong key\n" + error.message };
        }

        return {
          ...old,
          [chatId]: {
            ...old[chatId],
            messages: [...old[chatId].messages, messageData],
            unread: chatId == window.selectedChat ? 0 : old[chatId].unread + 1,
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
      window.setSelectedChat(
        window.selectedChat == chatId ? null : window.selectedChat
      );
      setData((old) => {
        alert(
          `chat "${old[chatId].chatName}" is deleted by an user. it get deleted from your device too`
        );
        const newData = { ...old };
        delete newData[chatId];
        return newData;
      });
    });

    client.onSay("user-joined", ({ chatId, message }) => {
      setData((old) => {
        let author;
        try {
          author = decrypt(old[chatId].password, message);
        } catch (error) {
          author = "error";
        }
        return {
          ...old,
          [chatId]: {
            ...old[chatId],
            messages: [
              ...old[chatId].messages,
              {
                type: "user-joined",
                data: "user joined: " + author,
                author,
                id: randomBytes(4).toString(CryptoJS.enc.Hex),
              },
            ],
          },
        };
      });
    });

    client.onSay("user-exited", ({ chatId, message }) => {
      setData((old) => {
        let author;
        try {
          author = decrypt(old[chatId].password, message);
        } catch (error) {
          author = "error";
        }
        return {
          ...old,
          [chatId]: {
            ...old[chatId],
            messages: [
              ...old[chatId].messages,
              {
                type: "user-exited",
                data: "user exited: " + author,
                author,
                id: randomBytes(4).toString(CryptoJS.enc.Hex),
              },
            ],
          },
        };
      });
    });

    const userStateChangeTimeouts = {};
    client.onSay("user-state-change", ({ chatId, message }) => {
      setData((old) => {
        let author, state;
        try {
          const data = JSON.parse(decrypt(old[chatId].password, message));
          author = data.author;
          state = data.state;
        } catch (error) {
          return old;
        }

        userStateChangeTimeouts[chatId] = userStateChangeTimeouts[chatId] || {};

        if (userStateChangeTimeouts[chatId][author]) {
          clearTimeout(userStateChangeTimeouts[chatId][author]);
        }

        userStateChangeTimeouts[chatId][author] = setTimeout(() => {
          setData((old) => {
            const userStates = old[chatId].userStates || {};
            delete userStates[author];

            return {
              ...old,
              [chatId]: {
                ...old[chatId],
                userStates,
              },
            };
          });
        }, 4_000);

        return {
          ...old,
          [chatId]: {
            ...old[chatId],
            userStates: { ...(old[chatId].userStates || {}), [author]: state },
          },
        };
      });
    });

    client.onSay("all-messages-deleted", ({ chatId }) => {
      setData((old) => {
        return {
          ...old,
          [chatId]: {
            ...old[chatId],
            messages: [
              { type: "deleted-messages", data: "all messages deleted" },
            ],
          },
        };
      });
    });

    return client;
  };
}
