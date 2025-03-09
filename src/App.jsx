import { useEffect, useState } from "react";
import { NavigationBar } from "./comp/nabigation-bar";
import { ChatRoom } from "./comp/chat-room";
import { JoinChat } from "./comp/join-chat";
import { useWsClient } from "./hooks/use-ws-client";
import Mobile from "./mobile";
import NoChat from "./comp/nochat";
import getShareQueryParams from "./utils/share-traget";

export default function App({ setData, data }) {
  useEffect(() => {
    const share = getShareQueryParams();
    if (share) alert(JSON.parse(share))
  }, []);

  const [currentChat, setCurrentChat] = useState(null);
  window.selectedChat = currentChat;
  window.setSelectedChat = setCurrentChat;

  const { client, state, reCreateClient, isClosed } = useWsClient(
    data,
    setData
  );

  if (state === "failed" || isClosed) {
    return <button onClick={() => reCreateClient()}>Reconnect</button>;
  }

  if (client == null) return state;

  if (innerWidth > 768)
    return (
      <div className="app-container">
        <NavigationBar
          chats={data}
          currentChat={currentChat}
          setCurrentChat={setCurrentChat}
          setChats={setData}
          client={client}
        />
        <aside>
          <JoinChat
            setCurrentChat={setCurrentChat}
            client={client}
            setData={setData}
          />
        </aside>
        <main>
          {currentChat && data[currentChat] ? (
            <ChatRoom
              chatId={currentChat}
              chatData={data[currentChat]}
              client={client}
              setData={setData}
            />
          ) : (
            <NoChat />
          )}
        </main>
      </div>
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
