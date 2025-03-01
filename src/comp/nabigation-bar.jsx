// Navigation bar to switch between chat groups
export function NavigationBar({
  chats,
  currentChat,
  setCurrentChat,
  setChats,
  client,
}) {
  return (
    <nav className="nav-bar">
      <ul>
        {Object.keys(chats).map((chatId) => (
          <li
            key={chatId}
            className={chatId === currentChat ? "active" : ""}
            onContextMenu={(e) => {
              e.preventDefault();
              if (
                !confirm(
                  `Are you sure you want to delte the chat "${chatId}" with all messages?`
                )
              )
                return;
              setChats((old) => {
                const newChats = { ...old };
                delete newChats[chatId];
                return newChats;
              });

              client.get("exit", chatId);
            }}
          >
            <button onClick={() => setCurrentChat(chatId)}>{chatId}</button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
