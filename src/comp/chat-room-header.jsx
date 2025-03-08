import QRCode from "react-qr-code";

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed">
    <path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed">
    <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed">
    <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
  </svg>
);

const DeleteChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m376-300 104-104 104 104 56-56-104-104 104-104-56-56-104 104-104-104-56 56 104 104-104 104 56 56Zm-96 180q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520Zm-400 0v520-520Z" /></svg>

const UpdateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed">
    <path d="M280-160v-80h400v80H280Zm160-160v-327L336-544l-56-56 200-200 200 200-56 56-104-103v327h-80Z" />
  </svg>
);

export function ChatRoomHeader({ chatId, chatData, setData, client }) {
  function toggleFormVisibility() {
    const formElement = document.getElementById("chat-data-form");
    formElement.classList.toggle("none");
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (!confirm("Are you sure you want to change your public chat username?")) return;

    setData((prevData) => ({
      ...prevData,
      [chatId]: {
        ...prevData[chatId],
        author: formData.get("author"),
      },
    }));

    e.target.classList.add("none");
  }

  function handleCloseForm(e) {
    e.preventDefault();
    const formElement = document.getElementById("chat-data-form");
    formElement.classList.add("none");
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

    const parentForm = e.target.parentElement;
    parentForm.classList.add("none");
  }

  function renderForm() {
    return (
      <form id="chat-data-form" className="none" onSubmit={handleFormSubmit}>
        <button className="danger" type="reset" onClick={handleCloseForm} title="Close">
          <CloseIcon />
        </button>


        <fieldset>
          <legend>Delete All Messages</legend>
          <button className="danger" type="button" onClick={handleDeleteAllMessages}>
            <DeleteIcon /> Delete All Messages
          </button>
        </fieldset>

        <fieldset>
          <legend>Delete Chat</legend>
          <button title="delete chat" className="danger" onClick={window?.deleteChat?.(chatId)}>
            <DeleteChatIcon /> Delete Chat  </button>
        </fieldset>

        <fieldset>
          <legend>
            Change Username
          </legend>
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
          <legend>Password</legend>
          <input name="password" type="text" readOnly value={chatData.rawPassword} />
        </fieldset>

        <QRCode
          className="qr-code"
          value={`${chatData.chatName}\n${chatData.rawPassword}`}
          size={60}
          tabIndex={-1}
        />
      </form>
    );
  }

  function renderHeader() {
    return (
      <header key={chatId}>
        <h3>{chatData?.chatName}</h3>

        <button type="button" title="Chat Settings" onClick={toggleFormVisibility}>
          <SettingsIcon />
        </button>

        {renderForm()}
      </header>
    );
  }

  return renderHeader();
}