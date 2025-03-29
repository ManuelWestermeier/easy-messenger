import Message from "./message";
import { ChatRoomHeader } from "./chat-room-header";
import ChatRoomSendForm from "./chat-room-send-form";
import { useEffect, useState } from "react";
import CallView from "./call-view";

// Component for displaying and sending messages in a chat room
export function ChatRoom({ chatId, chatData, client, setData, page }) {
  const [isCalling, setIsCalling] = useState(false);

  chatData.isCalling = isCalling;

  window.acceptCall = () => setIsCalling(true);

  useEffect(() => {
    if (page === true) {
      return;
    }
    const messages = document.querySelectorAll(".message");
    if (messages && messages[messages.length - 1]) {
      messages[messages.length - 1].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [chatId, page]);

  return (
    <div className="chat-room">
      <ChatRoomHeader
        client={client}
        chatData={chatData}
        chatId={chatId}
        setData={setData}
      />
      <div className="messages">
        {chatData.messages
          .filter(({ type }) => type != "update")
          .map((msg, index) => (
            <Message
              msg={msg}
              chatData={chatData}
              index={index}
              key={msg.id}
              chatId={chatId}
              client={client}
              setData={setData}
            />
          ))}
      </div>
      <ChatRoomSendForm
        chatData={chatData}
        chatId={chatId}
        setData={setData}
        client={client}
      />
      <CallView
        isCalling={isCalling}
        password={chatData.password}
        client={client}
        setIsCalling={setIsCalling}
        chatId={chatId}
      />
    </div>
  );
}
