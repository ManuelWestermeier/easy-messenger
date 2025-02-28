import { useState } from "react";
import { NavigationBar } from "./comp/nabigation-bar";
import { ChatRoom } from "./comp/chat-room";
import { JoinChat } from "./comp/join-chat";
import { useWsClient } from "./hooks/use-ws-client";
import "./pwa.jsx"

// Main Application Component
export default function App({ setData, data }) {
  const { client, state, reCreateClient, isClosed } = useWsClient(
    data,
    setData
  );
  const [currentChat, setCurrentChat] = useState(
    Object.keys(data || {})?.[0] ?? null
  );

  if (state === "failed" || isClosed) {
    return <button onClick={() => reCreateClient()}>Reconnect</button>;
  }

  if (client == null) return state;

  return (
    <div className="app-container">
      <NavigationBar
        chats={data}
        currentChat={currentChat}
        setCurrentChat={setCurrentChat}
      />
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
      <aside>
        <JoinChat
          setCurrentChat={setCurrentChat}
          client={client}
          setData={setData}
        />
      </aside>
    </div>
  );
}
