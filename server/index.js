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

/*
Server Data:
chats[chatId] = {
  clients: [{ client, author }],
  messages: [{ id, message }],
  subscriptions: {
    [url]: Subscription
  },
  passwordHashHash: basicHash(passwordHash),
};
*/

export const chats = {};

initMessengerServer();