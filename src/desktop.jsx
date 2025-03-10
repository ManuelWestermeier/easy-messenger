import { ChatRoom } from "./comp/chat-room";
import { JoinChat } from "./comp/join-chat";
import { NavigationBar } from "./comp/nabigation-bar";
import NoChat from "./comp/nochat";

export default function Desktop({
  currentChat,
  setCurrentChat,
  client,
  setData,
  data,
}) {
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
          data={data}
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
}
