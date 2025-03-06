import QRCode from "react-qr-code";

export function ChatRoomHeader({ chatId, chatData, setData }) {
  return (
    <header>
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
          Close
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
  );
}
