import QRCode from "react-qr-code";

export function ChatRoomHeader({ chatId, chatData, setData, client }) {
  return (
    <header key={chatId}>
      <h3>{chatData?.chatName}</h3>

      <button
        type="button"
        title="Chat Settings"
        onClick={(_) =>
          document.getElementById("chat-data-form").classList.toggle("none")
        }
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z" /></svg>
      </button>
      <form
        className="none"
        id="chat-data-form"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          if (
            !confirm(
              "Are you sure you want to change your public chat username?"
            )
          )
            return;
          setData((old) => {
            return {
              ...old,
              [chatId]: {
                ...old[chatId],
                author: fd.get("author"),
              },
            };
          });
          e.target.classList.add("none");
        }}
      >
        <button
          className="danger"
          type="reset"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("chat-data-form").classList.add("none");
          }}
          title="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" /></svg>
        </button>
        <hr />
        <button
          className="danger"
          type="button"
          onClick={async (e) => {
            e.preventDefault();
            await client.get("delete-all-messages", chatId);
            setData((old) => {
              return {
                ...old,
                [chatId]: {
                  ...old[chatId],
                  messages: [
                    { type: "deleted-messages", data: "all messages deleted" },
                  ],
                },
              };
            });
            e.target.parentElement.classList.add("none");
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" /></svg> Delete All Messages
        </button>
        <hr />
        <input
          name="author"
          type="text"
          placeholder="name..."
          defaultValue={chatData.author}
        />
        <button type="submit"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M280-160v-80h400v80H280Zm160-160v-327L336-544l-56-56 200-200 200 200-56 56-104-103v327h-80Z" /></svg>Update Data</button>
        <hr />
        <input
          name="password"
          type="text"
          readOnly
          value={chatData.rawPassword}
        />
        <hr />
        <QRCode
          className="qr-code"
          value={`${chatData.chatName}\n${chatData.rawPassword}`}
          size={60}
          tabIndex={-1}
        />
      </form>
    </header>
  );
}
