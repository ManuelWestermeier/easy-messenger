import { config } from "dotenv";
config();

console.clear();

const originalLog = console.log;
console.log = function (...args) {
  if (process.env.LOG) {
    originalLog(...args);
  }
};

import GitHubFS from "gh-fs";
import initMessengerServer from "./create-server.js";

// Initialize GitHubFS instance with an explicit branch (e.g. "main")
export const githubFS = new GitHubFS({
  authToken: process.env.GITHUB_API_TOKEN,
  owner: "manuelwestermeier",
  repo: "easy-messenger-data",
  branch: "main", // Ensure this branch exists in your repository
  defaultCommitter: {
    email: "westermeier111@gmail.com",
    name: "Manuel Westermeier",
  },
  encryptionKey: process.env.ENC_PASSWORD, // Use a strong, secure key
});

const storeInterval = process.env?.DEBUG ? 2000 : 40000; // 40 seconds

/*
Server Data:
chats[chatId] = {
  clients: [{ client, author }],
  messages: [{ id, message }],
  subscriptions: {},
  passwordHashHash: basicHash(passwordHash),
};
*/

export const chats = {};

/**
 * Store each chat room’s data to GitHubFS.
 * The stored file will be located in the "chats" directory and will
 * contain only the messages and password hash (the clients are excluded).
 * The chatId is encoded to ensure a valid filename.
 */
let isStoring = false;
export async function storeAllChatRoomsData() {
  if (process.env?.DEBUG || isStoring) return;
  isStoring = true;
  console.log("[store all chatrooms data]");
  for (const chatId in chats) {
    const { messages, passwordHashHash, subscriptions } = chats[chatId];
    const chatRoomData = {
      passwordHashHash,
      subscriptions,
      messagesLength: messages.length,
    };

    // Encode chatId to ensure a valid file name.
    try {
      const dataFileName = `chats/${encodeURIComponent(chatId)}.json`;
      await githubFS.writeFile(
        dataFileName,
        JSON.stringify(chatRoomData),
        new Date().toString(), // commit message as a string
        { branch: "main" } // explicitly specify the branch
      );

      // Write each message to its own file.
      for (let index = 0; index < messages.length; index++) {
        const messageFileName = `chats/${encodeURIComponent(
          chatId
        )}-message-${index}.json`;
        await githubFS.writeFile(
          messageFileName,
          JSON.stringify(messages[index]),
          new Date().toString(),
          { branch: "main" }
        );
      }

      // Clean up any undeleted message files if the number of messages has decreased.
      let index = messages.length;
      while (true) {
        const messageFileName = `chats/${encodeURIComponent(
          chatId
        )}-message-${index}.json`;
        if (await githubFS.exists(messageFileName)) {
          await githubFS.deleteFile(messageFileName);
          index++;
        } else {
          break;
        }
      }
    } catch (error) {
      console.error(`Failed to store chat room ${chatId}:`, error);
    }
  }
  isStoring = false;
}

/**
 * Fetch all existing chat room data from the "chats" directory.
 * If the directory is missing or no files exist, a default chat room is created.
 */
async function fetchAllChatRoomsData() {
  if (process.env?.DEBUG) return;

  console.log("[fetching all chatrooms data]");

  try {
    let filesResponse;
    try {
      filesResponse = await githubFS.readDir("chats");
    } catch (readError) {
      // If the chats directory doesn't exist, create it.
      console.warn("Chats directory not found, creating directory...");
      await githubFS.createDir("chats", "Initial creation of chats directory");
      filesResponse = [];
    }

    // Default to an empty array if no response is returned.
    if (!filesResponse) {
      filesResponse = [];
    }

    const files = Array.isArray(filesResponse)
      ? filesResponse
      : Object.values(filesResponse);

    // If no chat files exist, create a default chat room.
    if (files.length === 0) {
      await storeAllChatRoomsData();
      return;
    }

    for (const file of files) {
      if (
        file.type === "file" &&
        file.name.endsWith(".json") &&
        !file.name.includes("-message-")
      ) {
        try {
          // Remove the ".json" extension and decode the chatId.
          const chatIdEncoded = file.name.slice(0, -5);
          const chatId = decodeURIComponent(chatIdEncoded);
          const filePath = `chats/${file.name}`;
          const content = await githubFS.readFile(filePath);
          const data = JSON.parse(content);

          // Create an array with the number of messages.
          const messages = new Array(data.messagesLength);

          for (let index = 0; index < data.messagesLength; index++) {
            const messageFileName = `chats/${encodeURIComponent(
              chatId
            )}-message-${index}.json`;
            const messageContent = await githubFS.readFile(messageFileName);
            messages[index] = JSON.parse(messageContent);
          }

          // Clean up any extra message files.
          let index = data.messagesLength;
          while (true) {
            const messageFileName = `chats/${encodeURIComponent(
              chatId
            )}-message-${index}.json`;
            if (await githubFS.exists(messageFileName)) {
              await githubFS.deleteFile(messageFileName);
              index++;
            } else {
              break;
            }
          }

          // Initialize the chat room in memory (clients array remains empty).
          chats[chatId] = {
            messages,
            passwordHashHash: data.passwordHashHash,
            clients: [],
            subscriptions: data?.subscriptions || {},
          };
        } catch (error) {
          console.error("Error fetching chat room data:", error);
        }
      }
    }
    console.log("Fetched all chat room data");
  } catch (error) {
    console.error("Error fetching chat room data:", error);
  }
}

/**
 * Initialize the application:
 * 1. Fetch the stored chat data (or create a default chat room on first run).
 * 2. Start the messenger server.
 * 3. Set up a periodic task to store all chat rooms.
 */
async function initialize() {
  // First, fetch existing chat data.
  await fetchAllChatRoomsData();

  // Second, start the messenger server.
  initMessengerServer();

  // Third, start the periodic interval to store chats.
  setTimeout(async function update() {
    console.log("update:", new Date().toLocaleDateString("de"));

    try {
      await storeAllChatRoomsData();
      if (process.env.DEBUG) console.log("Current chats:", chats);
      console.log(
        "amount of clients: ",
        (() => {
          const entries = Object.values(chats);
          const clientsSet = new Set();
          for (const { clients } of entries) {
            for (const { client } of clients) {
              clientsSet.add(client);
            }
          }
          return clientsSet.size;
        })()
      );
    } catch (error) {
      console.error("Error during periodic store:", error);
    }
    setTimeout(update, storeInterval);
  }, storeInterval);
}

// Start the application.
initialize();

// Ensure data is stored when the process exits.
process.on("exit", () => {
  storeAllChatRoomsData().catch(console.error);
});
