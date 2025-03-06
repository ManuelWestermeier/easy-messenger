import createClient from "../utils/create-client";
import { useClient } from "wsnet-client-react";
import { useEffect } from "react";
import initClient from "../utils/init-client";

// Custom hook to handle the WebSocket client connection and incoming messages
export function useWsClient(data, setData) {
  const [client, state, reCreateClient, isClosed] = useClient(
    createClient(setData),
    true,
    true
  );

  useEffect(() => {
    if (!client) return;
    initClient(client, data, setData);
  }, [client]);

  return {
    data,
    setData,
    client,
    state,
    reCreateClient,
    isClosed,
  };
}
