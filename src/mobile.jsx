import { useState } from "react";
import { ChatRoom } from "./comp/chat-room";
import { JoinChat } from "./comp/join-chat";
import { NavigationBar } from "./comp/nabigation-bar";

export default function Mobile({
  currentChat,
  setCurrentChat,
  client,
  setData,
  data,
}) {
  const [page, setPage] = useState(true);

  return (
    <div className="app-container mobile">
      <div className="page" style={{ display: page ? "" : "none" }}>
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
      </div>
      <div className="page" style={{ display: !page ? "" : "none" }}>
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
      <div className="navigation">
        <button className={page ? "active" : ""} onClick={() => setPage(true)}>
          Chats
        </button>
        <button
          className={!page ? "active" : ""}
          onClick={() => setPage(false)}
        >
          Chat
        </button>
      </div>
    </div>
  );
}
