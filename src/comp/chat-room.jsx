import React, { useState, useEffect } from "react";
import Message from "./message";
import { ChatRoomHeader } from "./chat-room-header";
import ChatRoomSendForm from "./chat-room-send-form";
import CallView from "./call-view";

export function ChatRoom({ chatId, chatData, client, setData, page }) {
  const [isCalling, setIsCalling] = useState(false);

  window.acceptCall = () => {
    setIsCalling(true);
    client.say("join-call", chatId);
  };

  useEffect(() => {
    if (!page) {
      const messages = document.querySelectorAll(".message");
      if (messages && messages[messages.length - 1]) {
        messages[messages.length - 1].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
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
          .filter(({ type }) => type !== "update")
          .map((msg, index) => (
            <Message
              key={msg.id}
              msg={msg}
              chatData={chatData}
              index={index}
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
        password={chatData.password}
        onBroadcast={(fn) => client.onSay("borascast-inner-group", fn, true)}
        broadcast={(data) => {
          client.say("call-broadcast", { chatId, data });
        }}
        exit={() => {
          client.say("exit-call", chatId);
          setIsCalling(false);
        }}
        isCalling={isCalling}
      />
    </div>
  );
}
