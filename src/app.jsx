import { useEffect, useState } from "react";
import { useWsClient } from "./hooks/use-ws-client";
import Mobile from "./mobile";
import getShareQueryParams from "./utils/share-traget";
import LoadingState from "./comp/loading-state";
import ShareData from "./comp/share-data";
import Desktop from "./desktop";
import "./utils/shortcut";

let lastRecreatedClient = 0;

export default function App({ setData, data }) {
  const [shareData, setShareData] = useState(getShareQueryParams());
  window.setShareData = setShareData;
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    window.addEventListener("online", () => setIsOffline(false));
    window.addEventListener("offline", () => setIsOffline(true));
  }, []);

  const [currentChat, setCurrentChat] = useState(null);
  window.selectedChat = currentChat;
  window.setSelectedChat = setCurrentChat;

  const { client, state, reCreateClient, isClosed, chatsLoaded } = useWsClient(
    data,
    setData
  );

  window.reCreateClient = reCreateClient;

  const [waitForServer, setWaitForServer] = useState(false);
  if (client == null && isOffline && waitForServer)
    return <LoadingState setWaitForServer={setWaitForServer} state={state} />;

  if (shareData != false) {
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

  function Content() {
    if (innerWidth > 768)
      return (
        <Desktop
          client={client}
          currentChat={currentChat}
          data={data}
          setCurrentChat={setCurrentChat}
          setData={setData}
        />
      );
    else
      return (
        <Mobile
          client={client}
          currentChat={currentChat}
          data={data}
          setCurrentChat={setCurrentChat}
          setData={setData}
        />
      );
  }

  if (state == "closed" && !isOffline && lastRecreatedClient < 2000) {
    lastRecreatedClient = Date.now();
    reCreateClient();
  }

  return (
    <div
      className={
        isOffline ||
        isClosed ||
        state == "closed" ||
        state == "failed" ||
        chatsLoaded
          ? "offline"
          : "online"
      }
    >
      <Content />
      <div className="reconnect">
        {!chatsLoaded && <h3>You aren't connected....🛜</h3>}
        {chatsLoaded && (
          <span>
            Chats to have to load: {chatsLoaded}/{Object.keys(data).length + 1}
          </span>
        )}
        <div style={{ margin: "20px" }}>
          <button className="reconnect-button" onClick={() => reCreateClient()}>
            Reconnect
          </button>
        </div>
      </div>
    </div>
  );
}
