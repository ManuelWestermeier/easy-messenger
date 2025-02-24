import { useClient } from "wsnet-client-react";
import Client from "wsnet-client";
import { useState } from "react";
import { decrypt } from "../utils/crypto";

// Custom hook to handle the WebSocket client connection and incoming messages
export function useWsClient() {
    const [data, setData] = useState({});
    const [client, state, reCreateClient, isClosed] = useClient(() => {
        const client = new Client("ws://localhost:8080");

        client.onSay("message", ({ id, message }) => {
            setData((old) => {
                let messageData;
                try {
                    messageData = decrypt(old[id].password, message);
                } catch (error) {
                    messageData = JSON.stringify({ type: "error", data: "wrong key" });
                }
                return {
                    ...old,
                    [id]: {
                        ...old[id],
                        messages: [...old[id].messages, JSON.parse(messageData)]
                    }
                };
            });
        });

        return client;
    }, true, true);

    return { data, setData, client, state, reCreateClient, isClosed };
}