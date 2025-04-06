import dotenv from "dotenv";
dotenv.config(); // Load environment variables

const sendFailureTreshhold = parseInt(process.env.SEND_FAILURE_TRESHHOLD ?? 10);

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
    return new Error(error);
  }
}

import { areSetAndTheSameType } from "are-set";
import { createServer } from "wsnet-server";
import {
  chats,
  githubFS,
  loadChatRoom,
  originalLog,
  storeAllChatRoomsData,
  storeChatRommData,
} from "./index.js";

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
  originalLog("server started...");

  if (process.env.KEEP_ALIVE) {
    new WebSocket(process.env.KEEP_ALIVE);
  }

  createServer({ port: 8080 }, async (client) => {
    // Keep track of the chats this client has joined
    let joinedChats = [];

    client.removeChat = (chatId) => {
      joinedChats = joinedChats.filter((chat) => chat != chatId);
    };

    async function send(type = "message", chatId, message, messageId) {
      for (const { client: otherClient } of chats[chatId].clients) {
        if (otherClient != client) {
          otherClient.say(type, { chatId, message, messageId });
        }
      }
    }

    // Handle join requests
    client.onGet("join", async (data) => {
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

      if (!chats[chatId] && !process.env.DEBUG) await loadChatRoom(chatId);

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
        if (chat.passwordHashHash != passwordHashHash) {
          return false;
        }

        joinedChats.push(chatId);

        chat.clients.push({ client, author });

        if (subscription && !chat.subscriptions[subscription.endpoint]) {
          chat.subscriptions[subscription.endpoint] = {
            ...subscription,
            failureIndex: 0,
          };
          chats[chatId].hasChanged = true;
        }

        send("user-joined", chatId, author, 0);

        if (chat?.call && chat?.call?.length != 0)
          client.say("start-call", chatId);
      } else {
        joinedChats.push(chatId);

        chats[chatId] = {
          clients: [{ client, author }],
          messages: [],
          passwordHashHash,
          subscriptions: subscription
            ? { [subscription.endpoint]: subscription }
            : {},
          hasChanged: true,
        };

        return [];
      }

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
          chats[chatId].hasChanged = true;
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
        sendPushNotification(subscription, "chat-deleted").then(isSend => {
          if (
            isSend instanceof Error &&
            chats[chatId].subscriptions[subscriptionId].failureIndex++ > sendFailureTreshhold
          ) {
            delete chats[chatId].subscriptions[subscriptionId];
          } else {
            chats[chatId].subscriptions[subscriptionId].failureIndex = 0;
          }
        });
      }

      chats[chatId].clients.forEach(({ client }) => {
        client.removeChat(chatId);
      });

      if (!process.env.DEBUG) {
        try {
          const fileName = `chats/${encodeURIComponent(chatId)}`;
          await githubFS.deleteDir(fileName);
        } catch (error) { }
      }

      delete chats[chatId];

      return true;
    });

    // Handle sending messages
    client.onGet("delete-all-messages", async (chatId) => {
      if (typeof chatId !== "string") return false;
      if (!joinedChats.includes(chatId)) return false;
      if (!chats[chatId]) return false;

      if (chats[chatId].messages.length != 0) chats[chatId].hasChanged = true;
      chats[chatId].messages = [];

      send("all-messages-deleted", chatId, 0, 0);

      for (const subscriptionId in chats[chatId].subscriptions) {
        const subscription = chats[chatId].subscriptions[subscriptionId];
        sendPushNotification(
          subscription,
          "delete-all-messages"
        ).then(isSend => {
          if (
            isSend instanceof Error &&
            chats[chatId].subscriptions[subscriptionId].failureIndex++ > sendFailureTreshhold
          ) {
            delete chats[chatId].subscriptions[subscriptionId];
            chats[chatId].subscriptions[subscriptionId].failureIndex = 0;
          }
        })
      }

      return true;
    });

    client.onSay("user-state-change", (data) => {
      if (
        !areSetAndTheSameType(data, [
          ["chatId", "string"],
          ["message", "string"],
        ])
      )
        return false;

      const { chatId, message } = data;
      if (!joinedChats.includes(chatId)) return false;
      if (!chats[chatId]) return false;

      send("user-state-change", chatId, message);
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
        sendPushNotification(
          subscription,
          "send"
        ).then(isSend => {
          if (
            isSend instanceof Error &&
            chats[chatId].subscriptions[subscriptionId].failureIndex++ > sendFailureTreshhold
          ) {
            delete chats[chatId].subscriptions[subscriptionId];
            chats[chatId].subscriptions[subscriptionId].failureIndex = 0;
          }
        })
      }

      chats[chatId].messages.push({ id, message });
      chats[chatId].hasChanged = true;

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

        sendPushNotification(
          subscription,
          "message-deleted"
        ).then(isSend => {
          if (
            isSend instanceof Error &&
            chats[chatId].subscriptions[subscriptionId].failureIndex++ > sendFailureTreshhold
          ) {
            delete chats[chatId].subscriptions[subscriptionId];
            chats[chatId].subscriptions[subscriptionId].failureIndex = 0;
          }
        })
      }

      const prevMessagesLength = chats[chatId].messages.length;
      chats[chatId].messages = chats[chatId].messages.filter(
        ({ id: msgId }) => msgId != id
      );

      if (
        prevMessagesLength != chats[chatId].messages.length &&
        !process.env.DEBUG
      )
        try {
          chats[chatId].hasChanged = true;
          githubFS.deleteFile(
            `chats/${encodeURIComponent(chatId)}/messages/${prevMessagesLength - 1
            }.txt`
          ).then(storeAllChatRoomsData);
        } catch (error) { }

      return true;
    });

    client.onSay("call-broadcast", (data) => {
      if (!areSetAndTheSameType(data, [["chatId", "string"]])) return false;

      const { chatId } = data;

      if (!joinedChats.includes(chatId)) return;

      if (!chats[chatId].call) return;

      for (const cli of chats[chatId].call) {
        if (cli != client) {
          cli.say("borascast-inner-group", data.data);
        }
      }
    });

    client.onSay("join-call", async (chatId) => {
      if (typeof chatId != "string") return;

      if (!joinedChats.includes(chatId)) return;

      if (!chats[chatId]) return;

      if (!chats[chatId].call) {
        for (const { client } of chats[chatId].clients) {
          client.say("start-call", chatId);
        }
        chats[chatId].call = [];

        for (const subscriptionId in chats[chatId].subscriptions) {
          const subscription = chats[chatId].subscriptions[subscriptionId];
          sendPushNotification(
            subscription,
            "call"
          ).then(isSend => {
            if (
              isSend instanceof Error &&
              chats[chatId].subscriptions[subscriptionId].failureIndex++ > sendFailureTreshhold
            ) {
              delete chats[chatId].subscriptions[subscriptionId];
              chats[chatId].subscriptions[subscriptionId].failureIndex = 0;
            }
          })
        }
      }

      chats[chatId].call.push(client);
    });

    client.onSay("exit-call", async (chatId) => {
      if (typeof chatId != "string") return;

      if (!joinedChats.includes(chatId)) return;

      if (!chats?.[chatId]?.call) return;

      chats[chatId].call = chats[chatId].call.filter((cli) => cli != client);

      if (chats[chatId].call.length == 0) {
        for (const { client: cli } of chats[chatId].clients) {
          cli.say("call-removed", chatId);
        }
        delete chats[chatId].call;
      }
    });

    // Clean up when a client disconnects
    client.onclose = () => {
      joinedChats.forEach(async (chatId) => {
        if (!chats[chatId]) return;
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

        if (chats[chatId]?.call) {
          chats[chatId].call = chats[chatId].call.filter(
            (cli) => cli != client
          );

          if (chats[chatId].call.length == 0) {
            for (const { client: cli } of chats[chatId].clients) {
              cli.say("call-removed", chatId);
            }
            delete chats[chatId].call;
          }
        }

        if (chats[chatId].clients.length == 0) {
          if (chats[chatId].hasChanged) {
            await storeChatRommData(chatId);
            delete chats[chatId];
          }
          delete chats[chatId];
        } else if (author) {
          send("user-exited", chatId, author, 0);
          if (chats[chatId]?.call?.length == 0) {
            for (const { client: cli } of chats[chatId].clients) {
              if (cli != client) {
                cli.say("call-removed", chatId);
              }
            }
          }
        }
      });
      try {
        storeAllChatRoomsData();
      } catch (error) { }
    };
  });
}
