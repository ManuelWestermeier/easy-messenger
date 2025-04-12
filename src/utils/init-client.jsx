import Client from "wsnet-client";
import { basicHash, decrypt, encrypt, randomBytes } from "./crypto";
import CryptoJS from "crypto-js";

/**
 * @param {Client} client
 */
export default async function initClient(
  client,
  data,
  setData,
  setChatsLoaded,
) {
  // Initial cleanup: remove duplicate messages and unwanted types for all chats.
  setData((oldData) => {
    data = Object.keys(oldData).reduce((acc, chatId) => {
      const seenIds = {};
      acc[chatId] = {
        ...oldData[chatId],
        isCalling: false,
        messages: oldData[chatId].messages.filter(({ type, id }) => {
          if (["user-joined", "user-exited", "deleted-messages"].includes(type))
            return false;
          if (seenIds[id]) return false;
          seenIds[id] = true;
          return true;
        }),
      };
      return acc;
    }, {});
    return data;
  });

  const chats = Object.entries(data);
  setChatsLoaded(chats.length);

  // Object to accumulate modifications for each chat.
  const modifications = {};

  // Process each chat concurrently.
  await Promise.all(
    chats.map(async ([chatId, chatInfo]) => {
      // Build a map of current message IDs (from the cleaned chatInfo).
      const messageIds = chatInfo.messages.reduce((acc, { id }) => {
        acc[id] = true;
        return acc;
      }, {});

      // Attempt to join the chat and fetch new messages.
      let joinRes = await client.get("join", {
        chatId,
        passwordHash: basicHash(basicHash(chatInfo.password)),
        author: encrypt(chatInfo.password, chatInfo.author),
        messageIds,
        subscription: window.notificationSubscription,
      });

      let unread = joinRes ? joinRes.length : 0;
      let joinMessages = [];
      const toDelete = {};

      if (joinRes && joinRes.length) {
        // If the last element indicates deleted messages, update unread and mark messages to delete.
        if (joinRes[joinRes.length - 1]?.deleted === true) {
          const deletionEntry = joinRes.pop();
          unread += deletionEntry.deletedMessages.length;
          for (const id of deletionEntry.deletedMessages) {
            toDelete[id] = true;
          }
        }
        // Decrypt and parse each join message.
        joinMessages = joinRes.map(({ id, message }) => {
          try {
            return {
              ...JSON.parse(decrypt(chatInfo.password, message)),
              id,
            };
          } catch (error) {
            return {
              type: "error",
              data: "an error occurred (wrong password) (ignorable error)",
              id,
            };
          }
        });
      }

      // Fetch and process user data.
      let userMessages = [];
      let users = await client.get("users", chatId);
      if (users && users.length) {
        const authors = users.map((user) => {
          try {
            return decrypt(chatInfo.password, user);
          } catch (error) {
            return "error";
          }
        });
        userMessages = authors.map((author) => ({
          type: "user-joined",
          data: "user joined: " + author,
          author,
          id: randomBytes(4).toString(CryptoJS.enc.Base64),
        }));
      }

      // Start with the existing messages from the cleaned chat.
      let messages = chatInfo.messages;
      // Remove messages that are marked for deletion.
      if (Object.keys(toDelete).length) {
        messages = messages.filter(({ id }) => !toDelete[id]);
      }
      // Merge join messages and user join messages.
      messages = [...messages, ...joinMessages, ...userMessages];

      // Remove duplicate messages based on id.
      const seen = {};
      messages = messages.filter((msg) => {
        if (seen[msg.id]) return false;
        seen[msg.id] = true;
        return true;
      });

      // Process update messages (for example, comment additions).
      for (const msg of joinMessages) {
        if (msg.type === "update") {
          const [editMsgId, updateType, value] = msg.data;
          const index = messages.findIndex((m) => m.id === editMsgId);
          if (index !== -1 && updateType === "comment") {
            messages[index].comments = messages[index].comments || [];
            messages[index].comments.push(value);
          }
        }
      }

      // Accumulate modifications for this chat.
      modifications[chatId] = {
        ...chatInfo,
        unread,
        messages,
        userStates: {},
      };

      // Decrement the number of chats left to load.
      setChatsLoaded((x) => x - 1);
    }),
  );

  // Finally, update all chats with one setData call.
  setData((old) => ({
    ...old,
    ...modifications,
  }));
}
