import { encrypt, randomBytes } from "../utils/crypto";

export default function ChatRoomSendForm({
  chatId,
  chatData,
  client,
  setData,
}) {
  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const message = {
      type: fd.get("type"),
      data: fd.get("text"),
      date: new Date().toLocaleString(),
      author: chatData.author,
      comments: [],
    };

    const messagePublic = {
      id: randomBytes(4).toString(),
    };

    // Update local state with the new message
    setData((old) => ({
      ...old,
      [chatId]: {
        ...old[chatId],
        messages: [...old[chatId].messages, { ...message, ...messagePublic }],
      },
    }));

    const isSent = await client.get("send", {
      chatId,
      message: encrypt(chatData.password, JSON.stringify(message)),
      ...messagePublic,
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
  );
}
