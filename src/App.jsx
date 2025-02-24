import { useState } from "react";
import { NavigationBar } from "./comp/nabigation-bar";
import { ChatRoom } from "./comp/chat-room";
import { JoinChat } from "./comp/join-chat";
import { useWsClient } from "./hook/use-ws-client";

// Main Application Component
export default function App() {
  const { data, setData, client, state, reCreateClient, isClosed } = useWsClient();
  const [currentChat, setCurrentChat] = useState(null);

  if (state === "failed" || isClosed) {
    return <button onClick={() => reCreateClient()}>Reconnect</button>;
  }

  if (client == null) return state;

  return (
    <div className="app-container">
      <header>
        <h1>MW-S-ENC-Chat</h1>
      </header>
      <NavigationBar chats={data} currentChat={currentChat} setCurrentChat={setCurrentChat} />
      <main>
        {currentChat && data[currentChat] ? (
          <ChatRoom chatId={currentChat} chatData={data[currentChat]} client={client} setData={setData} />
        ) : (
          <div className="no-chat-selected">
            <p>Please select a chat from the navigation bar or join a new chat.</p>
          </div>
        )}
      </main>
      <aside>
        <JoinChat setCurrentChat={setCurrentChat} client={client} setData={setData} />
      </aside>
    </div>
  );
}
