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
      return alert("error: chat cant be deleted");

    setChats((old) => {
      const newChats = { ...old };
      delete newChats[chatId];
      return newChats;
    });

    handleCloseForm(e);
  };

  window.deleteChat = deleteChat;

  const exitChat = (chatId) => async (e) => {
    e.preventDefault();
    if (
      !confirm(
        `are you sure you want to leave chat: "${chats[chatId]?.chatName}"?`
      )
    )
      return;
    if (
      !(await client.get("exit", {
        chatId,
        subscription: window.notificationSubscription,
      }))
    )
      return alert("error: chat cant be exited");
    setChats((old) => {
      const newChats = { ...old };
      delete newChats[chatId];
      return newChats;
    });
  };

  const selectChat = (chatId) => (e) => {
    e.preventDefault();
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
  };

  return (
    <nav className="nav-bar">
      <ul>
        {Object.keys(chats).map((chatId) => (
          <li
            key={chatId}
            className={chatId === currentChat ? "active" : ""}
            onContextMenu={exitChat(chatId)}
          >
            <button className="chat-select-button" onClick={selectChat(chatId)}>
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
