import { useState, useEffect } from "react";
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

  useEffect(() => {
    let startX = 0;
    const threshold = innerWidth / 2; // Minimum swipe distance

    const handleTouchStart = (event) => {
      startX = event.touches[0].clientX;
    };

    const handleTouchEnd = (event) => {
      let endX = event.changedTouches[0].clientX;
      if (startX - endX > threshold && page) {
        setPage(false); // Swipe left → Open chat
      } else if (endX - startX > threshold && !page) {
        setPage(true); // Swipe right → Open chat list
      }
    };

    if (window.isCalling) {
      window.addEventListener("touchstart", handleTouchStart);
      window.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [page]);

  return (
    <div className="app-container mobile">
      <div className={`page ${page ? "page-open" : ""}`}>
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
      <div className={`page ${page ? "" : "page-open"}`}>
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
