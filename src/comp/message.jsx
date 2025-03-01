import { encrypt } from "../utils/crypto";

const userColors = {};

export default function Message({
  chatData,
  msg,
  index,
  client,
  chatId,
  setData,
}) {
  // Generate a random color for the user if they don't have one already.
  if (!userColors[msg.author]) {
    userColors[msg.author] = `rgb(${Math.floor(
      Math.random() * 100 + 50
    )}, ${Math.floor(Math.random() * 100 + 50)}, ${Math.floor(
      Math.random() * 100 + 50
    )})`;
  }

  return (
    <div
      key={index}
      style={{ backgroundColor: userColors[msg.author] }}
      className={
        "message" + (msg.author == chatData.author ? " own-msg" : " other")
      }
      onContextMenu={async (e) => {
        e.preventDefault();
        if (!confirm("Are you sure you want to delete this message")) return;
        const deleteMessage = {
          type: "delete",
          id: msg.id,
        };
        const isSent = await client.get("send", {
          id: chatId,
          message: encrypt(chatData.password, JSON.stringify(deleteMessage)),
        });
        if (!isSent) alert("error: message isn't deleted");
        setData((old) => {
          let messages = old[chatId].messages.filter((m) => m.id !== msg.id);
          return {
            ...old,
            [chatId]: {
              ...old[chatId],
              messages,
            },
          };
        });
      }}
    >
      <p>{msg.data}</p>
      <p className="meta">
        {msg.date} | {msg.author}
      </p>
    </div>
  );
}
