import { useState } from "react";
import { NavigationBar } from "./comp/nabigation-bar";
import { ChatRoom } from "./comp/chat-room";
import { JoinChat } from "./comp/join-chat";
import { useWsClient } from "./hooks/use-ws-client";
import Mobile from "./mobile";

// Main Application Component
export default function App({ setData, data }) {
  let currentChat, setCurrentChat;

  const { client, state, reCreateClient, isClosed } = useWsClient(
    data,
    setData,
    currentChat
  );

  [currentChat, setCurrentChat] = useState(
    Object.keys(data || {})?.[0] ?? null
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
            <div className="no-chat-selected">
              <p>
                Please select a chat from the navigation bar or join a new chat.
              </p>
            </div>
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
