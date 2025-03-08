// Navigation bar to switch between chat groups
export function NavigationBar({
  chats,
  currentChat,
  setCurrentChat,
  setChats,
  client,
  setPage,
}) {
  const deleteChat = (chatId) => async (e) => {
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
  }
  return (
    <nav className="nav-bar">
      <ul>
        {Object.keys(chats).map((chatId) => (
          <li
            key={chatId}
            className={chatId === currentChat ? "active" : ""}
            onContextMenu={deleteChat(chatId)}
          >
            <button
              className="chat-select-button"
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
              <button title="delete chat" className="danger" onClick={deleteChat(chatId)}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m376-300 104-104 104 104 56-56-104-104 104-104-56-56-104 104-104-104-56 56 104 104-104 104 56 56Zm-96 180q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520Zm-400 0v520-520Z" /></svg>
              </button>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
