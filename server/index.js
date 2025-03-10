import { config } from "dotenv";
config();

const log = console.log;
console.log = function (...args) {
  if (process.env.LOG) {
    log(...args);
  }
};

import GitHubFS from "gh-fs";
import initMessengerServer from "./create-server.js";

export const githubFS = new GitHubFS({
  authToken: process.env.GITHUB_API_TOKEN,
  owner: "manuelwestermeier",
  repo: "easy-messenger-data",
  branch: "main",
  defaultCommitter: {
    email: "westermeier111@gmail.com",
    name: "Manuel Westermeier",
  },
  encryptionKey: process.env.ENC_PASSWORD,
});

const storeInterval = process.env?.DEBUG ? 2_000 : 40_000;
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

let lastStored = 0;
async function storeChatRoomData(chatId) {
  if (process.env?.DEBUG) return;
  if (Date.now() - lastStored < storeInterval) return;
  lastStored = Date.now();

  const { messages, passwordHashHash, subscriptions } = chats[chatId];
  const chatMetadataPath = `chats/${encodeURIComponent(chatId)}.json`;
  const lengthPath = `chats/${encodeURIComponent(chatId)}/length.json`;

  try {
    await githubFS.writeFile(
      chatMetadataPath,
      JSON.stringify({ passwordHashHash, subscriptions }),
      `Updated metadata for ${chatId}`
    );

    await githubFS.writeFile(
      lengthPath,
      JSON.stringify({ length: messages.length }),
      `Updated length for ${chatId}`
    );

    for (let i = 0; i < messages.length; i++) {
      const messagePath = `chats/${encodeURIComponent(chatId)}/${i}.json`;
      await githubFS.writeFile(
        messagePath,
        JSON.stringify(messages[i]),
        `Updated message ${i} for ${chatId}`
      );
    }

    console.log(`Chat room ${chatId} stored successfully.`);
  } catch (error) {
    console.error(`Failed to store chat room ${chatId}:`, error);
  }
}

export async function storeAllChatRoomsData() {
  if (process.env?.DEBUG) return;
  for (const chatId in chats) {
    await storeChatRoomData(chatId);
  }
}

async function fetchChatRoomData(chatId) {
  const chatMetadataPath = `chats/${encodeURIComponent(chatId)}.json`;
  const lengthPath = `chats/${encodeURIComponent(chatId)}/length.json`;

  try {
    const metadataContent = await githubFS.readFile(chatMetadataPath);
    const metadata = JSON.parse(metadataContent);

    const lengthContent = await githubFS.readFile(lengthPath);
    const { length } = JSON.parse(lengthContent);

    const messages = [];
    for (let i = 0; i < length; i++) {
      const messagePath = `chats/${encodeURIComponent(chatId)}/${i}.json`;
      try {
        const messageContent = await githubFS.readFile(messagePath);
        messages.push(JSON.parse(messageContent));
      } catch (error) {
        console.warn(`Message ${i} missing for ${chatId}`);
      }
    }

    chats[chatId] = {
      messages,
      passwordHashHash: metadata.passwordHashHash,
      clients: [],
      subscriptions: metadata.subscriptions || {},
    };
    console.log(`Loaded chat room ${chatId}`);
  } catch (error) {
    console.error(`Error loading chat room ${chatId}:`, error);
  }
}

async function fetchAllChatRoomsData() {
  if (process.env?.DEBUG) return;
  try {
    let filesResponse = await githubFS.readDir("chats").catch(() => []);
    const chatIds = filesResponse.filter(f => f.type === "file" && f.name.endsWith(".json"))
      .map(f => decodeURIComponent(f.name.slice(0, -5)));
    for (const chatId of chatIds) {
      await fetchChatRoomData(chatId);
    }
  } catch (error) {
    console.error("Error fetching chat rooms:", error);
  }
}

async function initialize() {
  await fetchAllChatRoomsData();
  initMessengerServer();
  setTimeout(async function update() {
    await storeAllChatRoomsData().catch(console.error);
    setTimeout(update, storeInterval);
  }, storeInterval);
}

initialize();
process.on("exit", () => {
  storeAllChatRoomsData().catch(console.error);
});
