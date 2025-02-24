import { createServer } from "wsnet-server";

// Object to hold chat rooms and their connected clients
const chats = {};

createServer({ port: 8080 }, async (client) => {
    // Keep track of the chats this client has joined
    const joinedChats = [];

    // Handle join requests
    client.onGet("join", (chatId) => {
        if (joinedChats.includes(chatId)) return false;
        joinedChats.push(chatId);
        chats[chatId] = [client, ...(chats[chatId] || [])];
        return true;
    });

    // Handle sending messages
    client.onGet("send", (data) => {
        const { id: chatId, message } = data;
        if (!chats[chatId]) return false;
        chats[chatId].forEach((otherClient) => {
            if (otherClient === client) return;
            otherClient.say("message", { id: chatId, message });
        });
        return true;
    });

    // Clean up when a client disconnects
    client.onclose = () => {
        joinedChats.forEach((chatId) => {
            chats[chatId] = chats[chatId].filter((otherClient) => otherClient !== client);
        });
    };
});
