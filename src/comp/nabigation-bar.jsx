// Navigation bar to switch between chat groups
export function NavigationBar({
  chats,
  currentChat,
  setCurrentChat,
  setChats,
  client,
  setPage,
}) {
  return (
    <nav className="nav-bar">
      <ul>
        {Object.keys(chats).map((chatId) => (
          <li
            key={chatId}
            className={chatId === currentChat ? "active" : ""}
            onContextMenu={async (e) => {
              e.preventDefault();
              if (
                !confirm(
                  `Are you sure you want to delte the chat "${chats[chatId]?.chatName}" for all users in the chat with all messages?`
                )
              )
                return;
              if (!(await client.get("delete-chat", chatId)))
                return alert("chat cant be deleted");
              setChats((old) => {
                const newChats = { ...old };
                delete newChats[chatId];
                return newChats;
              });
            }}
          >
            <button
              onClick={() => {
                setCurrentChat(chatId);
                if (setPage) setPage(false);
                setChats((old) => {
                  return {
                    ...old,
                    [chatId]: {
                      ...old[chatId],
                      unread: 0,
                    },
                  };
                });
                const messageInput = document.querySelector(
                  '.chat-room .message-form input[name="text"]'
                );
                messageInput?.focus?.();

                const chatElem = document.querySelector(".chat-room");
                chatElem?.scrollIntoView?.({
                  block: "start",
                  behavior: "smooth",
                });
              }}
            >
              <span>{chats[chatId]?.chatName}</span>
              <span
                className={
                  "unread" + (chats[chatId].unread == 0 ? " hide" : "")
                }
              >
                {chats[chatId].unread}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
