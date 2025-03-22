import { useState } from "react";
import { ChatRoom } from "./comp/chat-room";
import { JoinChat } from "./comp/join-chat";
import { NavigationBar } from "./comp/nabigation-bar";
import NoChat from "./comp/nochat";

export default function Mobile({
  currentChat,
  setCurrentChat,
  client,
  setData,
  data,
}) {
  const [page, setPage] = useState(true);
  window.setPage = setPage;

  return (
    <div className="app-container mobile">
      <div className={"page" + (page ? " page-open" : "")} >
        <NavigationBar
          chats={data}
          currentChat={currentChat}
          setCurrentChat={setCurrentChat}
          setChats={setData}
          client={client}
          setPage={setPage}
        />
        <aside>
          <JoinChat
            setCurrentChat={setCurrentChat}
            client={client}
            setData={setData}
            setPage={setPage}
            data={data}
          />
        </aside>
      </div>
      <div className={"page" + (page ? "" : " page-open")}>
        <main>
          {currentChat && data[currentChat] ? (
            <ChatRoom
              chatId={currentChat}
              chatData={data[currentChat]}
              client={client}
              setData={setData}
              page={page}
            />
          ) : (
            <NoChat />
          )}
        </main>
      </div>
    </div>
  );
}
