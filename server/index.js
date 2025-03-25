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
  repo: "easy-messenger-data-2",
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
  messages: [{ message }],
  subscriptions: {},
  passwordHashHash: basicHash(passwordHash),
};
*/
export const chats = {};

export async function storeChatRommData(chatId) {
  const { messages, passwordHashHash, subscriptions } = chats[chatId];
  const chatFolder = `chats/${encodeURIComponent(chatId)}`;
  try {
    // Update data file
    const dataContent = JSON.stringify([passwordHashHash, messages.length]);
    await githubFS.writeFile(
      `${chatFolder}/data.data`,
      dataContent,
      new Date().toString(),
      { branch: "main" }
    );

    // Update subscriptions file: delete if exists first to avoid conflicts
    const subsPath = `${chatFolder}/subscriptions.txt`;
    if (await githubFS.exists(subsPath)) {
      await githubFS.deleteFile(
        subsPath,
        `Delete old subscriptions file for ${chatId}`
      );
    }
    await githubFS.writeFile(
      subsPath,
      JSON.stringify(subscriptions),
      `Update subscriptions for ${chatId}`,
      { branch: "main" }
    );

    // Save each message in the messages folder
    const messagesFolder = `${chatFolder}/messages`;
    for (let index = 0; index < messages.length; index++) {
      await githubFS.writeFile(
        `${messagesFolder}/${index}.txt`,
        messages[index].message,
        `Save message ${index} for ${chatId}`,
        { branch: "main" }
      );
    }

    // Clean up any extra message files if messages have decreased
    let index = messages.length;
    while (true) {
      const messageFileName = `${messagesFolder}/${index}.txt`;
      if (await githubFS.exists(messageFileName)) {
        await githubFS.deleteFile(
          messageFileName,
          `Delete extra message file ${index} for ${chatId}`
        );
        index++;
      } else {
        break;
      }
    }
  } catch (error) {
    console.error(`Failed to store chat room ${chatId}:`, error);
  }
}

/**
 * Store each chat room’s data to GitHubFS.
 * Structure for each chat:
 *  chats/<chatid>/
 *    data.data         : JSON array [passwordHashHash, messagesLength]
 *    subscriptions.txt : JSON object for subscriptions
 *    messages/         : directory with each message in a file named {index}.txt
 */
export async function storeAllChatRoomsData() {
  if (process.env?.DEBUG) return;
  console.log("[store all chatrooms data]");
  for (const chatId in chats) {
    if (!chats[chatId].hasChanged) continue;
    chats[chatId].hasChanged = false;
    await storeChatRommData(chatId);
  }
}

export async function loadChatRoom(name) {
  try {
    const chatId = decodeURIComponent(name);
    const chatFolder = `chats/${encodeURIComponent(chatId)}`;
    // Read data file
    const dataContent = await githubFS.readFile(`${chatFolder}/data.data`);
    const [passwordHashHash, messagesLength] = JSON.parse(dataContent);

    // Read subscriptions file
    let subscriptions = {};
    try {
      const subsContent = await githubFS.readFile(
        `${chatFolder}/subscriptions.txt`
      );
      subscriptions = JSON.parse(subsContent);
    } catch (e) {
      console.error("Error reading subscriptions for chat", chatId, e);
    }

    // Read messages from messages folder
    const messagesFolder = `${chatFolder}/messages`;
    let messages = [];
    try {
      for (let i = 0; i < messagesLength; i++) {
        try {
          const content = await githubFS.readFile(`${messagesFolder}/${i}.txt`);
          messages.push({ message: content });
        } catch (err) {
          console.error("Error reading message file", file.name, err);
        }
      }
    } catch (err) {
      console.error("Error reading messages folder for chat", chatId, err);
    }

    // Clean up any extra message files
    let index = messagesLength;
    while (true) {
      const messageFileName = `${messagesFolder}/${index}.txt`;
      if (await githubFS.exists(messageFileName)) {
        await githubFS.deleteFile(
          messageFileName,
          `Delete extra message file ${index} for ${chatId}`
        );
        index++;
      } else {
        break;
      }
    }

    // Initialize the chat room in memory (clients remain empty)
    chats[chatId] = {
      messages,
      passwordHashHash,
      clients: [],
      subscriptions,
    };
  } catch (error) {
    console.error("Error fetching chat room data:", error);
  }
}

/**
 * Fetch all existing chat room data from the "chats" directory.
 * It expects that each chat is stored as a directory under "chats/".
 * For each chat, the data file, subscriptions file and messages folder are loaded.
 */
async function fetchAllChatRoomsData() {
  if (process.env?.DEBUG) return;
  console.log("[fetching all chatrooms data]");
  try {
    let chatDirs = [];
    try {
      const items = await githubFS.readDir("chats");
      // We expect directories here (each representing a chat room)
      chatDirs = items.filter((item) => item.type === "dir");
    } catch (readError) {
      console.warn("Chats directory not found, creating directory...");
      await githubFS.createDir("chats", "Initial creation of chats directory");
      chatDirs = [];
    }
    if (chatDirs.length === 0) {
      await storeAllChatRoomsData();
      return;
    }
    console.log("Fetched all chat room data");
  } catch (error) {
    console.error("Error fetching chat room data:", error);
  }
}

/**
 * Initialize the application:
 * 1. Fetch the stored chat data.
 * 2. Start the messenger server.
 * 3. Set up a periodic task to store all chats.
 */
async function initialize() {
  // First, fetch existing chat data.
  await fetchAllChatRoomsData();

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

// fetch the data.
initialize();
// Second, start the messenger server.
initMessengerServer();

// Ensure data is stored when the process exits.
process.on("exit", () => {
  storeAllChatRoomsData().catch(console.error);
});
