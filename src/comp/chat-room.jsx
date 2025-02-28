import QRCode from "react-qr-code";
import { encrypt, randomBytes } from "../utils/crypto";
import Message from "./message";

// Component for displaying and sending messages in a chat room
export function ChatRoom({ chatId, chatData, client, setData }) {
  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const message = {
      type: fd.get("type"),
      data: fd.get("text"),
      id: randomBytes(4).toString(),
      author: chatData.author,
      date: new Date().toLocaleDateString(),
    };

    // Update local state with the new message
    setData((old) => ({
      ...old,
      [chatId]: {
        ...old[chatId],
        messages: [...old[chatId].messages, message],
      },
    }));

    const isSent = await client.get("send", {
      id: chatId,
      message: encrypt(chatData.password, JSON.stringify(message)),
    });

    if (!isSent) {
      alert("A send error occurred");
    }
    e.target.reset();

    const messagesDiv = document.querySelector(".messages");
    if (messagesDiv) {
      messagesDiv.lastChild?.scrollIntoView?.({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  return (
    <div className="chat-room">
      <header>
        <h3>{chatId}</h3>
        <button
          type="button"
          onClick={(_) =>
            document.getElementById("chat-data-form").classList.toggle("none")
          }
        >
          Edit
        </button>
        <form
          className="none"
          id="chat-data-form"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            if (
              !confirm(
                "Are you sure you want to change your public chat password or username?"
              )
            )
              return;
            setData((old) => {
              return {
                ...old,
                [chatId]: {
                  ...old[chatId],
                  password: fd.get("password"),
                  author: fd.get("author"),
                },
              };
            });
            e.target.classList.add("none");
          }}
        >
          <button
            type="reset"
            onClick={(e) => {
              e.preventDefault();
              e.target.parentElement.classList.add("none");
            }}
          >
            close [ X ]
          </button>
          <input
            name="author"
            type="text"
            placeholder="name..."
            defaultValue={chatData.author}
          />
          <input
            name="password"
            type="password"
            defaultValue={chatData.password}
          />
          <button type="submit">change data</button>
        </form>
        <QRCode
          className="qr-code"
          value={`${chatId}\n${chatData.password}`}
          size={60}
          tabIndex={-1}
        />
      </header>
      <div className="messages">
        {chatData.messages.map((msg, index) => (
          <Message msg={msg} chatData={chatData} index={index} key={msg.id} />
        ))}
      </div>
      <form onSubmit={handleSubmit} className="message-form">
        {/* <select name="type">
                    <option value="text">Text</option>
                </select> */}
        <input type="hidden" value="text" name="type" />
        <input
          autoFocus
          type="text"
          name="text"
          placeholder="Type your message..."
          required
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
