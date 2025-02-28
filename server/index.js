import { areSetAndTheSameType } from "are-set";
import { createServer } from "wsnet-server";

// Object to hold chat rooms and their connected clients
const chats = {};

createServer({ port: 8080 }, async (client) => {
  console.log(chats);

  // Keep track of the chats this client has joined
  const joinedChats = [];

  function send(type = "message", chatId, message) {
    chats[chatId].forEach((otherClient) => {
      if (otherClient === client) return;
      otherClient.say(type, { id: chatId, message });
    });
  }

  // Handle join requests
  client.onGet("join", (chatId) => {
    if (typeof chatId != "string") return false;
    if (joinedChats.includes(chatId)) return false;
    joinedChats.push(chatId);
    chats[chatId] = [client, ...(chats[chatId] || [])];
    return true;
  });

  // Handle join requests
  client.onGet("exit", (chatId = "") => {
    if (typeof chatId != "string") return false;
    if (joinedChats.includes(chatId)) return false;
    joinedChats = joinedChats.filter((chat) => chat != chatId);
    chats[chatId] = chats[chatId].filter(
      (otherClient) => otherClient !== client
    );
    return true;
  });

  // Handle sending messages
  client.onGet("send", (data) => {
    if (
      !areSetAndTheSameType(data, [
        ["id", "string"],
        ["message", "string"],
      ])
    )
      return false;
    const { id: chatId, message } = data;
    if (!chats[chatId]) return false;
    send("message", chatId, message);
    return true;
  });

  // Clean up when a client disconnects
  client.onclose = () => {
    joinedChats.forEach((chatId) => {
      chats[chatId] = chats[chatId].filter(
        (otherClient) => otherClient !== client
      );
    });
  };
});
