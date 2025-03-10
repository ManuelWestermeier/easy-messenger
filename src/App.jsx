import { useState } from "react";
import { useWsClient } from "./hooks/use-ws-client";
import Mobile from "./mobile";
import getShareQueryParams from "./utils/share-traget";
import LoadingState from "./comp/loading-state";
import ShareData from "./comp/share-data";
import Desktop from "./desktop";

export default function App({ setData, data }) {
  const [shareData, setShareData] = useState(getShareQueryParams());
  window.setShareData = setShareData;

  const [currentChat, setCurrentChat] = useState(null);
  window.selectedChat = currentChat;
  window.setSelectedChat = setCurrentChat;

  const { client, state, reCreateClient, isClosed } = useWsClient(
    data,
    setData
  );

  if (state === "failed" || isClosed) {
    return (
      <div style={{ margin: "20px" }}>
        <button onClick={() => reCreateClient()}>Reconnect</button>
      </div>
    );
  }

  if (client == null) return <LoadingState state={state} />;

  if (shareData) {
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
