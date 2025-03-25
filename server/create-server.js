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
    console.error("Push notification error:", error);
    return new Error(error);
  }
}

import { areSetAndTheSameType } from "are-set";
import { createServer } from "wsnet-server";
import { chats, githubFS } from "./index.js"; // chats is an in-memory object

import CryptoJS from "crypto-js";

export function basicHash(data) {
  return CryptoJS.SHA512(data).toString(CryptoJS.enc.Hex);
}

/*
Client Function:
"user-exited" => { chatId, message: author, messageId: 0 }
"user-joined"  => { chatId, message: author, messageId: 0 }
"message"      => { chatId, message, messageId }
"message-deleted" => { chatId, message, messageId }
"chat-deleted" => { chatId, message: 0, messageId: 0 }
*/

// ---------- Helper Functions for Persistent Storage ----------

/**
 * Create storage structure for a new chat.
 * Folder structure: Chats/<chatId>/
 *   - data.data : JSON [passwordHash, 0]
 *   - messages/ : directory for message files (each file named msg-<id>.txt)
 *   - subscriptions.txt : JSON object for subscriptions
 */
async function createChatStorage(chatId, passwordHashHash, initialSubscriptions = {}) {
  const chatFolder = `Chats/${encodeURIComponent(chatId)}`;
  try {
    await githubFS.createDir(chatFolder, `Create chat folder for ${chatId}`);
    await githubFS.createDir(`${chatFolder}/messages`, `Create messages folder for ${chatId}`);
  } catch (error) {
    console.error("Error creating directories for chat", chatId, error);
  }
  try {
    await githubFS.writeFile(`${chatFolder}/data.data`, JSON.stringify([passwordHashHash, 0]), `Create data file for ${chatId}`);
  } catch (error) {
    console.error("Error writing data file for chat", chatId, error);
  }
  try {
    await githubFS.writeFile(`${chatFolder}/subscriptions.txt`, JSON.stringify(initialSubscriptions), `Create subscriptions file for ${chatId}`);
  } catch (error) {
    console.error("Error writing subscriptions file for chat", chatId, error);
  }
}

/**
 * Load persistent storage for a chat.
 * Returns an object with passwordHashHash, messages array, and subscriptions.
 */
async function loadChatStorage(chatId) {
  const chatFolder = `Chats/${encodeURIComponent(chatId)}`;
  let passwordHashHash = "";
  let messages = [];
  let subscriptions = {};
  try {
    const dataContent = await githubFS.readFile(`${chatFolder}/data.data`);
    const dataArray = JSON.parse(dataContent);
    passwordHashHash = dataArray[0];
    // Load messages from the messages directory:
    try {
      const messageFiles = await githubFS.readDir(`${chatFolder}/messages`);
      // Each message file is named "msg-<id>.txt"
      for (const fileName of messageFiles) {
        try {
          const fileContent = await githubFS.readFile(`${chatFolder}/messages/${fileName}`);
          // Extract id from filename assuming format: msg-<id>.txt
          const id = fileName.slice(4, -4); // remove "msg-" and ".txt"
          messages.push({ id, message: fileContent });
        } catch (err) {
          console.error("Error reading message file", fileName, err);
        }
      }
    } catch (err) {
      console.error("Error reading messages directory for chat", chatId, err);
    }
  } catch (error) {
    console.error("Error loading data file for chat", chatId, error);
  }
  try {
    const subsContent = await githubFS.readFile(`${chatFolder}/subscriptions.txt`);
    subscriptions = JSON.parse(subsContent);
  } catch (error) {
    console.error("Error loading subscriptions for chat", chatId, error);
  }
  return { passwordHashHash, messages, subscriptions };
}

/**
 * Update the chat’s data file.
 * Stores [passwordHashHash, current number of messages]
 */
async function updateChatData(chatId, passwordHashHash, messages) {
  const chatFolder = `Chats/${encodeURIComponent(chatId)}`;
  try {
    await githubFS.writeFile(`${chatFolder}/data.data`, JSON.stringify([passwordHashHash, messages.length]), `Update data file for ${chatId}`);
  } catch (error) {
    console.error("Error updating data file for chat", chatId, error);
  }
}

/**
 * Update the subscriptions file for a chat.
 */
async function updateChatSubscriptions(chatId, subscriptions) {
  const chatFolder = `Chats/${encodeURIComponent(chatId)}`;
  try {
    await githubFS.writeFile(`${chatFolder}/subscriptions.txt`, JSON.stringify(subscriptions), `Update subscriptions for ${chatId}`);
  } catch (error) {
    console.error("Error updating subscriptions file for chat", chatId, error);
  }
}

/**
 * Save a single message file.
 */
async function saveMessage(chatId, id, message) {
  const chatFolder = `Chats/${encodeURIComponent(chatId)}`;
  try {
    await githubFS.writeFile(`${chatFolder}/messages/msg-${id}.txt`, message, `Save message ${id} for ${chatId}`);
  } catch (error) {
    console.error("Error saving message", id, "for chat", chatId, error);
  }
}

/**
 * Delete a single message file.
 */
async function deleteMessageFile(chatId, id) {
  const chatFolder = `Chats/${encodeURIComponent(chatId)}`;
  try {
    await githubFS.deleteFile(`${chatFolder}/messages/msg-${id}.txt`, `Delete message ${id} for ${chatId}`);
  } catch (error) {
    console.error("Error deleting message file", id, "for chat", chatId, error);
  }
}

/**
 * Delete the entire chat folder from storage.
 */
async function deleteChatStorage(chatId) {
  const chatFolder = `Chats/${encodeURIComponent(chatId)}`;
  try {
    await githubFS.deleteDir(chatFolder, `Delete chat folder for ${chatId}`);
  } catch (error) {
    console.error("Error deleting chat folder for", chatId, error);
  }
}

/**
 * Persist all chats in memory to storage.
 * For each chat, update both the data file and subscriptions.
 */
async function storeAllChatRoomsData() {
  for (const chatId in chats) {
    try {
      await updateChatData(chatId, chats[chatId].passwordHashHash, chats[chatId].messages);
      await updateChatSubscriptions(chatId, chats[chatId].subscriptions);
    } catch (error) {
      console.error("Error storing data for chat", chatId, error);
    }
  }
}

// ------------------- Messenger Server -------------------

export default function initMessengerServer() {
  createServer({ port: 8080 }, async (client) => {
    // Keep track of the chats this client has joined
    let joinedChats = [];

    client.removeChat = (chatId) => {
      joinedChats = joinedChats.filter((chat) => chat !== chatId);
    };

    function send(type = "message", chatId, message, messageId) {
      for (const { client: otherClient } of chats[chatId].clients) {
        if (otherClient !== client) {
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

      const passwordHashHash = basicHash(passwordHash).slice(0, 12);
      let subscription = data?.subscription?.endpoint ? data?.subscription : false;
      if (subscription) {
        try {
          new URL(subscription.endpoint);
        } catch (error) {
          subscription = false;
        }
      }
      const chatFolder = `Chats/${encodeURIComponent(chatId)}`;

      // Check if chat exists in memory or on storage.
      if (chats[chatId]) {
        // Chat exists in memory; validate password and update subscriptions.
        if (chats[chatId].passwordHashHash !== passwordHashHash) return false;
        joinedChats.push(chatId);
        chats[chatId].clients.push({ client, author });
        if (subscription && !chats[chatId].subscriptions[subscription.endpoint]) {
          chats[chatId].subscriptions[subscription.endpoint] = subscription;
          await updateChatSubscriptions(chatId, chats[chatId].subscriptions);
        }
      } else if (await githubFS.exists(`${chatFolder}/data.data`)) {
        // Chat exists on storage; load persistent data.
        const { passwordHashHash: storedHash, messages, subscriptions } = await loadChatStorage(chatId);
        if (storedHash !== passwordHashHash) return false;
        chats[chatId] = {
          clients: [{ client, author }],
          messages,
          passwordHashHash: storedHash,
          subscriptions: subscriptions,
        };
        joinedChats.push(chatId);
        if (subscription && !chats[chatId].subscriptions[subscription.endpoint]) {
          chats[chatId].subscriptions[subscription.endpoint] = subscription;
          await updateChatSubscriptions(chatId, chats[chatId].subscriptions);
        }
      } else {
        // New chat – create in memory and on storage.
        joinedChats.push(chatId);
        chats[chatId] = {
          clients: [{ client, author }],
          messages: [],
          passwordHashHash,
          subscriptions: subscription ? { [subscription.endpoint]: subscription } : {},
        };
        await createChatStorage(chatId, passwordHashHash, chats[chatId].subscriptions);
      }

      // Prepare unread messages based on client provided messageIds.
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
      if (typeof chatId !== "string") return false;
      if (!chats[chatId]) return false;
      if (!joinedChats.includes(chatId)) return false;
      return chats[chatId].clients.map(({ author }) => author);
    });

    client.onGet("messages", (chatId) => {
      if (typeof chatId !== "string") return false;
      if (!joinedChats.includes(chatId)) return false;
      if (!chats[chatId]) return false;
      return chats[chatId].messages;
    });

    // Handle exit requests
    client.onGet("exit", async (data) => {
      if (!areSetAndTheSameType(data, [["chatId", "string"]])) return false;
      const { chatId } = data;
      if (!joinedChats.includes(chatId)) return false;

      let subscription = data?.subscription?.endpoint ? data?.subscription : false;
      let author;
      // Remove this client from the chat
      chats[chatId].clients = chats[chatId].clients.filter(({ client: otherClient, author: auth }) => {
        if (otherClient === client) {
          author = auth;
          return false;
        }
        return true;
      });
      if (subscription) {
        try {
          new URL(subscription.endpoint);
          delete chats[chatId].subscriptions[subscription.endpoint];
          await updateChatSubscriptions(chatId, chats[chatId].subscriptions);
        } catch (error) {
          subscription = false;
        }
      }
      joinedChats = joinedChats.filter((chat) => chat !== chatId);
      if (!author) return false;
      send("user-exited", chatId, author, 0);

      // If no clients remain, delete persistent chat storage and remove from memory.
      if (chats[chatId].clients.length === 0) {
        await deleteChatStorage(chatId);
        delete chats[chatId];
      }
      return true;
    });

    // Handle chat deletion (initiated by a client)
    client.onGet("delete-chat", async (chatId) => {
      if (typeof chatId !== "string") return false;
      if (!joinedChats.includes(chatId)) return false;
      if (!chats[chatId]) return false;

      send("chat-deleted", chatId, 0, 0);
      joinedChats = joinedChats.filter((chat) => chat !== chatId);
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
      await deleteChatStorage(chatId);
      delete chats[chatId];
      return true;
    });

    // Handle deletion of all messages in a chat
    client.onGet("delete-all-messages", async (chatId) => {
      if (typeof chatId !== "string") return false;
      if (!joinedChats.includes(chatId)) return false;
      if (!chats[chatId]) return false;

      // Delete each message file from persistent storage
      for (const msg of chats[chatId].messages) {
        await deleteMessageFile(chatId, msg.id);
      }
      chats[chatId].messages = [];
      await updateChatData(chatId, chats[chatId].passwordHashHash, chats[chatId].messages);

      send("all-messages-deleted", chatId, 0, 0);
      for (const subscriptionId in chats[chatId].subscriptions) {
        const subscription = chats[chatId].subscriptions[subscriptionId];
        const isSend = await sendPushNotification(subscription, "delete-all-messages");
        if (isSend instanceof Error) {
          delete chats[chatId].subscriptions[subscriptionId];
        }
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

    // Handle sending a new message
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

      // Check message length restriction
      if (message.length > 10000) return false;

      // Broadcast the message to other clients
      send("message", chatId, message, id);

      // Notify subscriptions
      for (const subscriptionId in chats[chatId].subscriptions) {
        const subscription = chats[chatId].subscriptions[subscriptionId];
        const isSend = await sendPushNotification(subscription, "send");
        if (isSend instanceof Error) {
          delete chats[chatId].subscriptions[subscriptionId];
        }
      }

      // Save message in memory and persistent storage
      chats[chatId].messages.push({ id, message });
      await saveMessage(chatId, id, message);
      await updateChatData(chatId, chats[chatId].passwordHashHash, chats[chatId].messages);

      return true;
    });

    // Handle deletion of a single message
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
        const isSend = await sendPushNotification(subscription, "message-deleted");
        if (isSend instanceof Error) {
          delete chats[chatId].subscriptions[subscriptionId];
        }
      }

      // Remove message from memory and persistent storage
      chats[chatId].messages = chats[chatId].messages.filter(({ id: msgId }) => msgId !== id);
      await deleteMessageFile(chatId, id);
      await updateChatData(chatId, chats[chatId].passwordHashHash, chats[chatId].messages);

      return true;
    });

    // Clean up when a client disconnects
    client.onclose = async () => {
      for (const chatId of joinedChats) {
        let author;
        chats[chatId].clients = chats[chatId].clients.filter(({ client: otherClient, author: auth }) => {
          if (otherClient === client) {
            author = auth;
            return false;
          }
          return true;
        });
        if (author) {
          send("user-exited", chatId, author, 0);
        }
        // If no clients remain, delete the chat from persistent storage
        if (chats[chatId].clients.length === 0) {
          await deleteChatStorage(chatId);
          delete chats[chatId];
        }
      }
    };

    // Persist chat room data after each client connection
    try {
      storeAllChatRoomsData();
    } catch (error) {
      console.error("Error storing all chat room data:", error);
    }
  });

  // Persist chat room data when the server starts
  try {
    storeAllChatRoomsData();
  } catch (error) {
    console.error("Error storing all chat room data:", error);
  }
}
