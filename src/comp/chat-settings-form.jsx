import React from "react";
import QRCode from "react-qr-code";
import { CloseIcon, DeleteIcon, DeleteChatIcon, UpdateIcon } from "./icons";

export function ChatSettingsForm({ chatId, chatData, setData, client }) {
  function handleCloseForm(e) {
    e.preventDefault();
    const formElement = document.getElementById("chat-data-form");
    formElement.classList.add("none");
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (!confirm("Are you sure you want to change your public chat username?"))
      return;

    setData((prevData) => ({
      ...prevData,
      [chatId]: {
        ...prevData[chatId],
        author: formData.get("author"),
      },
    }));

    handleCloseForm(e);
  }

  async function handleDeleteAllMessages(e) {
    e.preventDefault();
    await client.get("delete-all-messages", chatId);

    setData((prevData) => ({
      ...prevData,
      [chatId]: {
        ...prevData[chatId],
        messages: [{ type: "deleted-messages", data: "all messages deleted" }],
      },
    }));

    handleCloseForm(e);
  }

  return (
    <form id="chat-data-form" className="none" onSubmit={handleFormSubmit}>
      <button
        className="danger"
        type="reset"
        onClick={handleCloseForm}
        title="Close"
      >
        <CloseIcon />
      </button>

      <fieldset>
        <legend>Delete All Messages</legend>
        <button
          className="danger"
          type="button"
          onClick={handleDeleteAllMessages}
        >
          <DeleteIcon /> Delete All Messages
        </button>
      </fieldset>

      <fieldset>
        <legend>Delete Chat</legend>
        <button
          title="delete chat"
          className="danger"
          onClick={() => window?.deleteChat?.(chatId, handleCloseForm)}
        >
          <DeleteChatIcon /> Delete Chat
        </button>
      </fieldset>

      <fieldset>
        <legend>Change Username</legend>
        <input
          name="author"
          type="text"
          placeholder="name..."
          defaultValue={chatData.author}
        />
        <button style={{ marginTop: "10px" }} type="submit">
          <UpdateIcon /> Update Username
        </button>
      </fieldset>

      <fieldset>
        <legend>Chat-ID</legend>
        <input name="chat-id" type="text" readOnly value={chatData.rawChatId} />
      </fieldset>

      <fieldset>
        <legend>Password</legend>
        <input
          name="password"
          type="text"
          readOnly
          value={chatData.rawPassword}
        />
      </fieldset>

      <QRCode
        className="qr-code"
        value={`${chatData.rawChatId}\n${chatData.rawPassword}`}
        size={60}
        tabIndex={-1}
      />
    </form>
  );
}
