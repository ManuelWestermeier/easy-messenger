import { areSetAndTheSameType } from "are-set";
import { createServer } from "wsnet-server";
import { chats, storeAllChatRoomsData } from "./index.js";

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
    storeAllChatRoomsData();
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

      if (chat) {
        if (chat.passwordHashHash != passwordHashHash) return false;

        chat.clients.push({ client, author });

        send("user-joined", chatId, author, 0);
      } else {
        chats[chatId] = {
          clients: [{ client, author }],
          messages: [],
          passwordHashHash: passwordHashHash,
        };
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
    client.onGet("exit", (chatId = "") => {
      if (typeof chatId != "string") return false;
      if (!joinedChats.includes(chatId)) return false;

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

      joinedChats = joinedChats.filter((chat) => chat != chatId);

      if (!author) return false;

      send("user-exited", chatId, author, 0);

      return true;
    });

    // Handle sending messages
    client.onGet("delete-chat", (data) => {
      if (!areSetAndTheSameType(data, [["chatId", "string"]])) return false;
      const { chatId } = data;
      if (!joinedChats.includes(chatId)) return false;
      if (!chats[chatId]) return false;

      send("chat-deleted", chatId, 0, 0);

      joinedChats = joinedChats.filter((chat) => chat != chatId);

      chats[chatId].clients.forEach(({ client }) => {
        client.removeChat(chatId);
      });

      delete chats[chatId];

      return true;
    });

    // Handle sending messages
    client.onGet("send", (data) => {
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

      chats[chatId].messages.push({ id, message });

      return true;
    });

    // Handle sending messages
    client.onGet("delete-message", (data) => {
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

      chats[chatId].messages = chats[chatId].messages.filter(
        ({ id: msgId }) => msgId != id
      );

      return true;
    });

    // Clean up when a client disconnects
    client.onclose = () => {
      storeAllChatRoomsData();

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
  });
}
