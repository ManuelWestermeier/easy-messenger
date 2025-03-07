import QRCode from "react-qr-code";

export function ChatRoomHeader({ chatId, chatData, setData, client }) {
  return (
    <header key={chatId}>
      <h3>{chatData?.chatName}</h3>
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
          type="reset"
          onClick={(e) => {
            e.preventDefault();
            e.target.parentElement.classList.add("none");
          }}
        >
          Close
        </button>
        <hr />
        <button
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
          Delete All Messages
        </button>
        <hr />
        <input
          name="author"
          type="text"
          placeholder="name..."
          defaultValue={chatData.author}
        />
        <button type="submit">change data</button>
        <hr />
        <input
          name="password"
          type="text"
          readOnly
          value={chatData.rawPassword}
        />
      </form>
      <QRCode
        className="qr-code"
        value={`${chatData.chatName}\n${chatData.rawPassword}`}
        size={60}
        tabIndex={-1}
      />
    </header>
  );
}
