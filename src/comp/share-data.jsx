import { useState } from "react";
import { encrypt, randomBytes } from "../utils/crypto";
import MarkdownWithLinks from "./markdown-with-links";
import CryptoJS from "crypto-js";

export default function ShareData({
  shareData,
  setShareData,
  client,
  chats,
  setChats,
}) {
  const [messageText, setMessageText] = useState(shareData);
  const [selectedChats, setSelectedChats] = useState([]);

  const toggleChatSelection = (chatId) => {
    setSelectedChats((prev) =>
      prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId]
    );
  };

  const send = async (e) => {
    e.preventDefault();

    if (selectedChats.length === 0) {
      alert("Please select at least one chat.");
      return;
    }

    const messageData = messageText.trim();

    if (messageData === "") {
      alert("Please enter a message.");
      return;
    }

    for (const chatId of selectedChats) {
      const chatData = chats[chatId];

      const message = {
        type: "text",
        data: messageData,
        date: new Date().toLocaleString(),
        author: chatData.author,
        comments: [],
      };

      const messagePublic = { id: randomBytes(4).toString(CryptoJS.enc.Hex) };

      setChats((oldData) => ({
        ...oldData,
        [chatId]: {
          ...oldData[chatId],
          messages: [
            ...(oldData[chatId]?.messages || []),
            { ...message, ...messagePublic },
          ],
        },
      }));

      const encryptedMessage = encrypt(
        chatData.password,
        JSON.stringify(message)
      );

      const isSent = await client.get("send", {
        chatId,
        message: encryptedMessage,
        ...messagePublic,
      });
      if (!isSent) {
        alert(
          `A send error occurred for chat ${chatData.chatName}. Your message wasn't sent!`
        );
      }
    }

    // Replace only the hash, not the entire URL
    window.history.replaceState(
      "",
      "",
      "/easy-messenger/"
    );
    // set the data do no share data => false
    setShareData(false);
  };

  return (
    <div className="share-container">
      <div className="share-header">
        <h1>Share...</h1>
        <button
          className="danger"
          onClick={() => {
            // Replace only the hash, not the entire URL
            window.history.replaceState(
              "",
              "",
              "/easy-messenger/"
            );
            // set the data do no share data => false
            setShareData(false);
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            fill="#e8eaed"
          >
            <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
          </svg>
        </button>
      </div>
      <h3>Preview:</h3>
      <div className="preview-box">
        <MarkdownWithLinks text={messageText} />
      </div>
      <h3>Send:</h3>
      <form onSubmit={send} className="share-form preview-box">
        <textarea
          autoFocus
          name="text"
          placeholder="Type your message..."
          required
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
        />
        <button type="submit" className="send-btn" title="Send">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            fill="#e8eaed"
          >
            <path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z" />
          </svg>
        </button>
      </form>
      <div>
        <h3>Select Chats:</h3>
        <ul className="chat-list">
          {Object.keys(chats).map((chatId) => (
            <li key={chatId}>
              <button
                type="button"
                className={`chat-select-button ${
                  selectedChats.includes(chatId) ? "selected" : ""
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  toggleChatSelection(chatId);
                }}
              >
                {chats[chatId]?.chatName}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
