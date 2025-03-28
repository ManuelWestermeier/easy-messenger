import React from "react";
import { SettingsIcon, CallIcon } from "./icons";
import { ChatSettingsForm } from "./chat-settings-form";

export function ChatRoomHeader({ chatId, chatData, setData, client }) {
  function toggleFormVisibility() {
    const formElement = document.getElementById("chat-data-form");
    formElement.classList.toggle("none");
  }

  return (
    <header key={chatId}>
      <h3>
        {window?.setPage && (
          <button onClick={() => window.setPage(true)} type="button">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#e8eaed"
            >
              <path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z" />
            </svg>
          </button>
        )}
        {chatData?.chatName}
      </h3>

      <div className="user-states">
        {Object.keys(chatData?.userStates || {})
          .filter((key) => chatData?.userStates?.[key] === "is-writing")
          .map((author) => (
            <span key={author}>
              {author}
              <span>🖋️</span>
            </span>
          ))}
      </div>

      <div className="right">
        <button
          className={chatData.isCalling ? "calling" : ""}
          type="button"
          title="Chat Settings"
          onClick={(e) => {
            e.preventDefault();
            window?.acceptCall?.(chatId);
          }}
        >
          <CallIcon />
        </button>

        <button
          type="button"
          title="Chat Settings"
          onClick={toggleFormVisibility}
        >
          <SettingsIcon />
        </button>
      </div>

      <ChatSettingsForm
        chatId={chatId}
        chatData={chatData}
        setData={setData}
        client={client}
      />
    </header>
  );
}
