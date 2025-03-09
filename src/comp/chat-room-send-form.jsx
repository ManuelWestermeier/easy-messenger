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
      alert("A send error occurred. Your message isnt send!");
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
    <form onSubmit={handleSubmit} onKeyDown={e => {
      if (e.key == "Escape") handleSubmit({ preventDefault: () => 0, target: document.querySelector(".message-form") });
    }} className="message-form">
      {/* <select name="type">
             <option value="text">Text</option>
         </select> */}
      <input type="hidden" value="text" name="type" />
      <textarea
        autoFocus
        name="text"
        placeholder="Type your message..."
        required
      />
      <button type="submit" title="Send"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z" /></svg></button>
    </form>
  );
}
