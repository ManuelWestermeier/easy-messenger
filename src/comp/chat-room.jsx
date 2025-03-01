import Message from "./message";
import { ChatRoomHeader } from "./chat-room-header";
import ChatRoomSendForm from "./chat-room-send-form";

// Component for displaying and sending messages in a chat room
export function ChatRoom({ chatId, chatData, client, setData }) {
  return (
    <div className="chat-room">
      <ChatRoomHeader chatData={chatData} chatId={chatId} setData={setData} />
      <div className="messages">
        {chatData.messages.map((msg, index) => (
          <Message
            msg={msg}
            chatData={chatData}
            index={index}
            key={msg.id || index}
          />
        ))}
      </div>
      <ChatRoomSendForm
        chatData={chatData}
        chatId={chatId}
        setData={setData}
        client={client}
      />
    </div>
  );
}
