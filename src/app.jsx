import { useEffect, useState } from "react";
import { useWsClient } from "./hooks/use-ws-client";
import Mobile from "./mobile";
import Desktop from "./desktop";
import LoadingState from "./comp/loading-state";
import ShareData from "./comp/share-data";
import getShareQueryParams from "./utils/share-traget";
import "./utils/shortcut";
import useOnlineStatus from "./hooks/use-online";
import useInnerWidth from "./hooks/use-inner-width";

// Hold the last time we tried recreating the client
let lastRecreatedClient = 0;

/**
 * Component to render content based on window width.
 */
function Content({ client, currentChat, data, setCurrentChat, setData }) {
  const width = useInnerWidth();

  return width > 768 ? (
    <Desktop
      client={client}
      currentChat={currentChat}
      data={data}
      setCurrentChat={setCurrentChat}
      setData={setData}
    />
  ) : (
    <Mobile
      client={client}
      currentChat={currentChat}
      data={data}
      setCurrentChat={setCurrentChat}
      setData={setData}
    />
  );
}

/**
 * Component to display a reconnect banner and status.
 */
function ReconnectBanner({ chatsLoaded, data, reCreateClient }) {
  return (
    <div className="reconnect">
      {chatsLoaded < 1 ? (
        <>
          <h3>You aren't connected....🛜</h3>
          <div style={{ margin: "20px" }}>
            <button className="reconnect-button" onClick={reCreateClient}>
              Reconnect
            </button>
          </div>
        </>
      ) : (
        <span>
          Chats to have to load: {chatsLoaded}/{Object.keys(data).length}
        </span>
      )}
    </div>
  );
}

/**
 * Main App component.
 */
export default function App({ setData, data }) {
  // Retrieve initial share data from the URL query parameters.
  const [shareData, setShareData] = useState(getShareQueryParams());
  // Expose setters to the global scope (if required)
  window.setShareData = setShareData;

  // Use our custom hook to determine if the app is offline.
  const isOffline = useOnlineStatus();

  // Manage the selected chat.
  const [currentChat, setCurrentChat] = useState(null);
  window.selectedChat = currentChat;
  window.setSelectedChat = setCurrentChat;

  // Initialize WebSocket client.
  const { client, state, reCreateClient, isClosed, chatsLoaded } = useWsClient(
    data,
    setData,
  );
  window.reCreateClient = reCreateClient;

  // Manage waiting state for the server connection.
  const [waitForServer, setWaitForServer] = useState(true);

  // Attempt to reconnect if the client is closed (and not offline)
  useEffect(() => {
    if (
      state === "closed" &&
      !isOffline &&
      Date.now() - lastRecreatedClient > 2000
    ) {
      lastRecreatedClient = Date.now();
      reCreateClient();
    }
  }, [state, isOffline, reCreateClient]);

  // If no client is available and we're offline while waiting, show a loading state.
  const notLoaded = client == null && !isOffline;
  if ((notLoaded && waitForServer) || (shareData !== false && notLoaded)) {
    return <LoadingState setWaitForServer={setWaitForServer} state={state} />;
  }

  // If shareData is active, render the share data view.
  if (shareData !== false) {
    return (
      <ShareData
        client={client}
        shareData={shareData}
        setShareData={setShareData}
        setChats={setData}
        chats={data}
      />
    );
  }

  return (
    <div
      className={
        isOffline ||
        isClosed ||
        state === "closed" ||
        state === "failed" ||
        chatsLoaded
          ? "offline"
          : "online"
      }
    >
      <Content
        client={client}
        currentChat={currentChat}
        data={data}
        setCurrentChat={setCurrentChat}
        setData={setData}
      />
      <ReconnectBanner
        chatsLoaded={chatsLoaded}
        data={data}
        reCreateClient={reCreateClient}
      />
    </div>
  );
}
