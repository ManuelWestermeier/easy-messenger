import createClient from "../utils/create-client";
import { useClient } from "wsnet-client-react";
import { useEffect, useState } from "react";
import initClient from "../utils/init-client";

// Custom hook to handle the WebSocket client connection and incoming messages
export function useWsClient(data, setData) {
  const [client, state, reCreateClient, isClosed] = useClient(
    createClient(setData),
    true,
    true,
  );
  const [chatsLoaded, setChatsLoaded] = useState(Object.keys(data).length + 1);

  useEffect(() => {
    if (!client) return;
    initClient(client, data, setData, setChatsLoaded);
  }, [client]);

  return {
    data,
    setData,
    client,
    state,
    reCreateClient,
    isClosed,
    chatsLoaded,
  };
}
