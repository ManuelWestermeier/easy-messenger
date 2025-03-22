import { useState } from "react";
import { encrypt, randomBytes } from "../utils/crypto";

let lastStateChangeTime;

export default function ChatRoomSendForm({
  chatId,
  chatData,
  client,
  setData,
}) {
  const [reactId, setReactId] = useState(false);

  window.setReactId = setReactId;
  window.reactId = reactId;

  const reactMessageCt = chatData.messages.find(({ id }) => id == reactId);

  if (reactMessageCt?.data?.length > 100) {
    reactMessageCt.data = reactMessageCt.data.slice(0, 100);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const message = {
      type: fd.get("type"),
      data: fd.get("text"),
      date: new Date().toLocaleString(),
      author: chatData.author,
      comments: [],
      react:
        reactId && reactMessageCt
          ? [
              reactId,
              {
                author: reactMessageCt.author,
                data: reactMessageCt.data,
              },
            ]
          : false,
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

    e.target.reset();
    const isSent = await client.get("send", {
      chatId,
      message: encrypt(chatData.password, JSON.stringify(message)),
      ...messagePublic,
    });
    if (!isSent) {
      alert("A send error occurred. Your message isnt send!");
    }
    setReactId(false);

    const messagesDiv = document.querySelector(".messages");
    if (messagesDiv) {
      messagesDiv.lastChild?.scrollIntoView?.({
        behavior: "smooth",
        block: "center",
      });
    }

    client.say("user-state-change", {
      chatId,
      message: encrypt(
        chatData.password,
        JSON.stringify({ author: chatData?.author, state: "idle" })
      ),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key == "Escape")
          handleSubmit({
            preventDefault: () => 0,
            target: document.querySelector(".message-form"),
          });
      }}
      className="message-form"
    >
      <input type="hidden" value="text" name="type" />
      <textarea
        autoFocus={innerWidth > 768}
        name="text"
        placeholder="Type your message..."
        onInput={() => {
          if (lastStateChangeTime > Date.now() - 3_000) return;
          lastStateChangeTime = Date.now();

          client.say("user-state-change", {
            chatId,
            message: encrypt(
              chatData.password,
              JSON.stringify({ author: chatData?.author, state: "is-writing" })
            ),
          });
        }}
        required
      />
      <button type="submit" className="send-button" title="Send">
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
      {reactMessageCt && (
        <div className="react-elem">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setReactId(false);
            }}
            className="danger"
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
          <div
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(reactId).scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }}
          >
            <b>{reactMessageCt.author}</b>:
            <span>
              <i>{reactMessageCt.data}</i>
            </span>
          </div>
        </div>
      )}
    </form>
  );
}
