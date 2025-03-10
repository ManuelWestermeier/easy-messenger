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

  return (
    <div className="app-container mobile">
      <div className="page" style={{ display: page ? "" : "none" }}>
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
      <div className="page" style={{ display: !page ? "" : "none" }}>
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
      <div className="navigation">
        <button
          style={{
            opacity: !page ? "0.6" : "1",
          }}
          className={page ? "active" : ""}
          onClick={() => setPage(true)}
          title="Chats"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            style={{ marginRight: "5px" }}
            height="14px"
            viewBox="0 -960 960 960"
            width="14px"
            fill="#e8eaed"
          >
            <path d="M0-240v-63q0-43 44-70t116-27q13 0 25 .5t23 2.5q-14 21-21 44t-7 48v65H0Zm240 0v-65q0-32 17.5-58.5T307-410q32-20 76.5-30t96.5-10q53 0 97.5 10t76.5 30q32 20 49 46.5t17 58.5v65H240Zm540 0v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5q72 0 116 26.5t44 70.5v63H780Zm-455-80h311q-10-20-55.5-35T480-370q-55 0-100.5 15T325-320ZM160-440q-33 0-56.5-23.5T80-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T160-440Zm640 0q-33 0-56.5-23.5T720-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T800-440Zm-320-40q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-600q0 50-34.5 85T480-480Zm0-80q17 0 28.5-11.5T520-600q0-17-11.5-28.5T480-640q-17 0-28.5 11.5T440-600q0 17 11.5 28.5T480-560Zm1 240Zm-1-280Z" />
          </svg>{" "}
          Chats
        </button>
        <button
          style={{
            opacity: !currentChat || page ? "0.6" : "1",
            cursor: !currentChat ? "not-allowed" : "pointer",
            transition: "opacity 0.3s ease-in-out",
          }}
          disabled={!currentChat}
          className={!page ? "active" : ""}
          onClick={() => setPage(false)}
          title="Chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            style={{ marginRight: "5px" }}
            height="14px"
            viewBox="0 -960 960 960"
            width="14px"
            fill="#e8eaed"
          >
            <path d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z" />
          </svg>{" "}
          Chat
        </button>
      </div>
    </div>
  );
}
