import dotenv from "dotenv";
dotenv.config(); // Load environment variables

import webpush from "web-push";
import WEB_PUSH_PUBLIC_KEY from "../web-push-public-key.js";

const publicVapidKey = WEB_PUSH_PUBLIC_KEY;
const privateVapidKey = process.env.WEB_PUSH_PRIVATE_KEY;
const email = process.env.EMAIL;

if (!privateVapidKey) {
  console.error("Private Vapid Key is missing!");
  process.exit(1);
}

webpush.setVapidDetails(`mailto:${email}`, publicVapidKey, privateVapidKey);

async function sendPushNotification(subscription, data = "send") {
  try {
    return await webpush.sendNotification(subscription, data);
  } catch (error) {
    return error;
  }
}

import { areSetAndTheSameType } from "are-set";
import { createServer } from "wsnet-server";
import { chats, githubFS, storeAllChatRoomsData } from "./index.js";

import CryptoJS from "crypto-js";

export function basicHash(data) {
  return CryptoJS.SHA512(data).toString(CryptoJS.enc.Hex);
}

/*
Client Function:
"user-exited" => { chatId, message: author, messageId: 0 }
"user-joined" => { chatId, message: author, messageId: 0 }
"message" => { chatId, message, messageId }
"message-deleted" => { chatId, message, messageId }
"chat-deleted" => { chatId, message: 0 , messageId: 0 }
*/

/*
Create the messenger server. This function calls createServer
and contains all the logic for handling client events.
*/

export default function initMessengerServer() {
  createServer({ port: 8080 }, async (client) => {
    // Keep track of the chats this client has joined
    let joinedChats = [];

    client.removeChat = (chatId) => {
      joinedChats = joinedChats.filter((chat) => chat != chatId);
    };

    function send(type = "message", chatId, message, messageId) {
      for (const { client: otherClient } of chats[chatId].clients) {
        if (otherClient != client) {
          otherClient.say(type, { chatId, message, messageId });
        }
      }
    }

    // Handle join requests
    client.onGet("join", (data) => {
      if (
        !areSetAndTheSameType(data, [
          ["chatId", "string"],
          ["author", "string"],
          ["passwordHash", "string"],
          ["messageIds", "object"],
        ])
      )
        return false;
      const { chatId, author, passwordHash, messageIds } = data;

      if (joinedChats.includes(chatId)) return false;

      const chat = chats[chatId];

      const passwordHashHash = basicHash(passwordHash).slice(0, 12);

      let subscription = data?.subscription?.endpoint
        ? data?.subscription
        : false;
      if (subscription) {
        try {
          new URL(subscription.endpoint);
        } catch (error) {
          subscription = false;
        }
      }

      if (chat) {
        if (chat.passwordHashHash != passwordHashHash) return false;

        chat.clients.push({ client, author });

        if (subscription && !chat.subscriptions[subscription.endpoint]) {
          chat.subscriptions[subscription.endpoint] = subscription;
        }

        send("user-joined", chatId, author, 0);
      } else {
        chats[chatId] = {
          clients: [{ client, author }],
          messages: [],
          passwordHashHash,
          subscriptions: subscription
            ? { [subscription.endpoint]: subscription }
            : {},
        };
        return [];
      }

      joinedChats.push(chatId);

      const unread = [];

      for (const msg of chats[chatId].messages) {
        if (!messageIds[msg.id]) {
          unread.push(msg);
        } else {
          delete messageIds[msg.id];
        }
      }

      const deletedMessages = Object.keys(messageIds);
      if (deletedMessages.length > 0) {
        unread.push({
          id: 0,
          message: "",
          deleted: true,
          deletedMessages,
        });
      }

      return unread;
    });

    client.onGet("users", (chatId) => {
      if (typeof chatId != "string") return false;
      if (!chats[chatId]) return false;
      if (!joinedChats.includes(chatId)) return false;
      return chats[chatId].clients.map(({ author }) => author);
    });

    client.onGet("messages", (chatId) => {
      if (typeof chatId != "string") return false;

      if (!joinedChats.includes(chatId)) return false;

      if (!chats[chatId]) return false;

      return chats[chatId].messages;
    });

    // Handle exit requests
    client.onGet("exit", (data) => {
      if (!areSetAndTheSameType(data, [["chatId", "string"]])) return false;
      const { chatId } = data;
      if (!joinedChats.includes(chatId)) return false;

      let subscription = data?.subscription?.endpoint
        ? data?.subscription
        : false;

      let author;
      // Hier: Entferne den aktuellen Client aus der Liste
      chats[chatId].clients = chats[chatId].clients.filter(
        ({ client: otherClient, author: auth }) => {
          if (otherClient === client) {
            author = auth;
            return false; // Client entfernen
          }
          return true;
        }
      );

      if (subscription) {
        try {
          new URL(subscription.endpoint);
          delete chats[chatId].subscriptions[subscription.endpoint];
        } catch (error) {
          subscription = false;
        }
      }

      joinedChats = joinedChats.filter((chat) => chat != chatId);

      if (!author) return false;

      send("user-exited", chatId, author, 0);

      return true;
    });

    // Handle sending messages
    client.onGet("delete-chat", async (chatId) => {
      if (typeof chatId !== "string") return false;
      if (!joinedChats.includes(chatId)) return false;
      if (!chats[chatId]) return false;

      send("chat-deleted", chatId, 0, 0);

      joinedChats = joinedChats.filter((chat) => chat != chatId);

      for (const subscriptionId in chats[chatId].subscriptions) {
        const subscription = chats[chatId].subscriptions[subscriptionId];
        const isSend = await sendPushNotification(subscription, "chat-deleted");
        if (isSend instanceof Error) {
          delete chats[chatId].subscriptions[subscriptionId];
        }
      }

      chats[chatId].clients.forEach(({ client }) => {
        client.removeChat(chatId);
      });

      if (!process.env.DEBUG) {
        try {
          const fileName = `chats/${encodeURIComponent(chatId)}.json`;
          await githubFS.deleteFile(fileName);

          let index = 0;
          let checkForUndeletedChats = true;

          while (checkForUndeletedChats) {
            index++;
            try {
              const messageFileName = `chats/${encodeURIComponent(
                chatId
              )}-message-${index}.json`;

              if (await githubFS.exists(messageFileName)) {
                await githubFS.deleteFile(messageFileName);
              } else {
                checkForUndeletedChats = false;
              }
            } catch (error) {
              checkForUndeletedChats = false;
            }
          }
        } catch (error) {}
      }

      delete chats[chatId];

      return true;
    });

    // Handle sending messages
    client.onGet("delete-all-messages", async (chatId) => {
      if (typeof chatId !== "string") return false;
      if (!joinedChats.includes(chatId)) return false;
      if (!chats[chatId]) return false;

      chats[chatId].messages = [];

      send("all-messages-deleted", chatId, 0, 0);

      for (const subscriptionId in chats[chatId].subscriptions) {
        const subscription = chats[chatId].subscriptions[subscriptionId];
        const isSend = await sendPushNotification(
          subscription,
          "delete-all-messages"
        );
        if (isSend instanceof Error) {
          delete chats[chatId].subscriptions[subscriptionId];
        }
      }

      return true;
    });

    // Handle sending messages
    client.onGet("send", async (data) => {
      if (
        !areSetAndTheSameType(data, [
          ["chatId", "string"],
          ["message", "string"],
          ["id", "string"],
        ])
      )
        return false;
      const { chatId, message, id } = data;
      if (!joinedChats.includes(chatId)) return false;
      if (!chats[chatId]) return false;

      send("message", chatId, message, id);

      for (const subscriptionId in chats[chatId].subscriptions) {
        const subscription = chats[chatId].subscriptions[subscriptionId];
        const isSend = await sendPushNotification(subscription, "send");
        if (isSend instanceof Error) {
          delete chats[chatId].subscriptions[subscriptionId];
        }
      }

      chats[chatId].messages.push({ id, message });

      return true;
    });

    // Handle sending messages
    client.onGet("delete-message", async (data) => {
      if (
        !areSetAndTheSameType(data, [
          ["chatId", "string"],
          ["id", "string"],
        ])
      )
        return false;
      const { chatId, id } = data;
      if (!joinedChats.includes(chatId)) return false;
      if (!chats[chatId]) return false;

      send("message-deleted", chatId, 0, id);

      for (const subscriptionId in chats[chatId].subscriptions) {
        const subscription = chats[chatId].subscriptions[subscriptionId];
        const isSend = await sendPushNotification(
          subscription,
          "message-deleted"
        );
        if (isSend instanceof Error) {
          delete chats[chatId].subscriptions[subscriptionId];
        }
      }

      chats[chatId].messages = chats[chatId].messages.filter(
        ({ id: msgId }) => msgId != id
      );

      return true;
    });

    // Clean up when a client disconnects
    client.onclose = () => {
      joinedChats.forEach((chatId) => {
        let author;
        chats[chatId].clients = chats[chatId].clients.filter(
          ({ client: otherClient, author: auth }) => {
            if (otherClient === client) {
              author = auth;
              return false; // Client entfernen
            }
            return true;
          }
        );
        if (author) {
          send("user-exited", chatId, author, 0);
        }
      });
    };
    storeAllChatRoomsData();
  });
  storeAllChatRoomsData();
}
