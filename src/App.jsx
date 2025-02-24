import { useState } from "react";
import { useClient } from "wsnet-client-react";
import Client from "wsnet-client";
import { decrypt, encrypt, randomBytes } from "./utils/crypto";

// Custom hook to handle the WebSocket client connection and incoming messages
function useWsClient() {
  const [data, setData] = useState({});
  const [client, state, reCreateClient, isClosed] = useClient(() => {
    const client = new Client("ws://localhost:8080");

    client.onSay("message", ({ id, message }) => {
      setData((old) => {
        let messageData;
        try {
          messageData = decrypt(old[id].password, message);
        } catch (error) {
          messageData = JSON.stringify({ type: "error", data: "wrong key" });
        }
        return {
          ...old,
          [id]: {
            ...old[id],
            messages: [...old[id].messages, JSON.parse(messageData)]
          }
        };
      });
    });

    return client;
  }, true, true);

  return { data, setData, client, state, reCreateClient, isClosed };
}

// Component for displaying and sending messages in a chat room
function ChatRoom({ chatId, chatData, client, setData }) {
  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const message = {
      type: fd.get("type"),
      data: fd.get("text"),
      id: randomBytes(4),
      author: fd.get("author"),
      date: new Date().toLocaleDateString(),
    };

    // Update local state with the new message
    setData((old) => ({
      ...old,
      [chatId]: {
        ...old[chatId],
        messages: [...old[chatId].messages, message]
      }
    }));

    const isSent = await client.get("send", {
      id: chatId,
      message: encrypt(chatData.password, JSON.stringify(message)),
    });

    if (!isSent) {
      alert("A send error occurred");
    }
    e.target.reset();
  };

  return (
    <div className="chat-room">
      <h3>Chat: {chatId}</h3>
      <div className="messages">
        {chatData.messages.map((msg, index) => (
          <div key={index} className="message">
            <p>{msg.data}</p>
            <p className="meta">
              {msg.date} | {msg.author}
            </p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="message-form">
        <select name="type">
          <option value="text">Text</option>
        </select>
        <input type="text" name="text" placeholder="Type your message..." required />
        <input type="text" name="author" placeholder="Your name..." required />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

// Component for joining a new chat room
function JoinChat({ client, setData }) {
  const handleJoin = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const chatId = fd.get("id");
    const password = fd.get("password");

    const error = await client.get("join", chatId);
    if (error == false) {
      alert("An error occurred while joining the chat");
      return;
    }

    setData((old) => ({
      ...old,
      [chatId]: {
        password,
        messages: []
      }
    }));
    e.target.reset();
  };

  return (
    <form onSubmit={handleJoin} className="join-form">
      <input type="text" name="id" placeholder="Group to join..." required />
      <input type="password" name="password" placeholder="Encryption password..." required />
      <button type="submit">Join Chat</button>
    </form>
  );
}

// Navigation bar to switch between chat groups
function NavigationBar({ chats, currentChat, setCurrentChat }) {
  return (
    <nav className="nav-bar">
      <ul>
        {Object.keys(chats).map((chatId) => (
          <li key={chatId} className={chatId === currentChat ? "active" : ""}>
            <button onClick={() => setCurrentChat(chatId)}>{chatId}</button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

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
        <h1>Chat Application</h1>
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
        <JoinChat client={client} setData={setData} />
      </aside>
    </div>
  );
}
