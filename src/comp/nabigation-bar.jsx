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
                messageInput.focus();

                const chatElem = document.querySelector(".chat-room");
                chatElem.scrollIntoView({
                  block: "start",
                  behavior: "smooth",
                });
              }}
            >
              <span>{chatId}</span>
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
