import { createServer } from "wsnet-server";

const chats = {}
//create the websocket server on port 8080
createServer({ port: 8080 }, async (client) => {
    const chatsJoined = [];

    client.onGet("join", id => {
        if (chatsJoined.includes(id)) return false;
        chatsJoined.push(id);
        chats[id] = [client, ...(chats[id] || [])];
    });

    client.onGet("send", data => {
        chats[data.id].forEach(cli => {
            if (cli == client) return;
            cli.say("message", { id: data.id, message: data.message });
        });
        return true;
    });

    client.onclose = () => {
        chatsJoined.forEach(chat => {
            chats[chat] = chats[chat].filter(cli => cli != client);
        });
    }
});