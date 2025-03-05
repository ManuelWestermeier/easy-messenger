import MessageConetent from "./message-content";

const userColors = {};

export const userMessageTypes = ["text"];

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

  const isMenagementMessage = !userMessageTypes.includes(msg.type);

  const className = !isMenagementMessage
    ? msg.author == chatData.author
      ? "own-msg"
      : "other"
    : "menagement-msg";

  return (
    <div
      id={msg.id}
      key={index}
      style={{ backgroundColor: userColors[msg.author] }}
      className={"message " + className}
      onContextMenu={async (e) => {
        e.preventDefault();
        if (isMenagementMessage)
          return alert("menagement message ... you cant delete this message");
        if (!confirm("Are you sure you want to delete this message")) return;
        const isSent = await client.get("delete-message", {
          id: msg.id,
          chatId,
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
      <MessageConetent {...msg} />
    </div>
  );
}
