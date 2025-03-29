import React, { useState } from "react";

export function NavigationBar({
  chats,
  currentChat,
  setCurrentChat,
  setChats,
  client,
  setPage,
}) {
  const [editingChat, setEditingChat] = useState(null); // Only one chat can be edited at a time

  // Helper: remove chat from state
  const removeChat = (chatId) => {
    setChats((oldChats) => {
      const newChats = { ...oldChats };
      delete newChats[chatId];
      return newChats;
    });
  };

  // Delete a chat via API and update state
  const deleteChat = async (chatId) => {
    const result = await client.get("delete-chat", chatId);
    if (result) {
      removeChat(chatId);
    } else {
      console.error("Error: chat cannot be deleted");
    }
    if (editingChat === chatId) setEditingChat(null);
  };

  // Exit a chat via API and update state
  const exitChat = async (chatId) => {
    const result = await client.get("exit", {
      chatId,
      subscription: window.notificationSubscription,
    });
    if (result) {
      removeChat(chatId);
    } else {
      console.error("Error: chat cannot be exited");
    }
    if (editingChat === chatId) setEditingChat(null);
  };

  // Rename a chat (could call an API endpoint here)
  const renameChat = async (chatId, newName) => {
    setChats((old) => ({
      ...old,
      [chatId]: {
        ...old[chatId],
        chatName: newName,
      },
    }));
    setEditingChat(null);
  };

  // Set the current chat and clear editing if needed
  const selectChat = (chatId) => {
    setCurrentChat(chatId);
    if (setPage) setPage(false);
    setChats((old) => ({
      ...old,
      [chatId]: {
        ...old[chatId],
        unread: 0,
      },
    }));
    const messageInput = document.querySelector(
      '.chat-room .message-form input[name="text"]'
    );
    messageInput?.focus?.();
    const chatElem = document.querySelector(".chat-room");
    chatElem?.scrollIntoView?.({
      block: "start",
      behavior: "smooth",
    });
    if (editingChat !== null) setEditingChat(null);
  };

  return (
    <nav className="nav-bar">
      <ul>
        {Object.entries(chats).map(([chatId, chat]) => (
          <ChatItem
            key={chatId}
            chatId={chatId}
            chat={chat}
            isActive={chatId === currentChat}
            selectChat={selectChat}
            deleteChat={deleteChat}
            exitChat={exitChat}
            renameChat={renameChat}
            editingChat={editingChat}
            setEditingChat={setEditingChat}
          />
        ))}
      </ul>
    </nav>
  );
}

function ChatItem({
  chatId,
  chat,
  isActive,
  selectChat,
  deleteChat,
  exitChat,
  renameChat,
  editingChat,
  setEditingChat,
}) {
  const [newChatName, setNewChatName] = useState(chat.chatName);

  const handleRename = async (e) => {
    e.preventDefault();
    await renameChat(chatId, newChatName);
  };

  // Toggle the edit mode for this chat (only one at a time)
  const toggleEdit = (e) => {
    e.stopPropagation();
    if (editingChat === chatId) {
      setEditingChat(null);
    } else {
      setEditingChat(chatId);
    }
  };

  // Right-click to toggle the edit mode
  const handleContextMenu = (e) => {
    e.preventDefault();
    toggleEdit(e);
  };

  return (
    <li className={isActive ? "active" : ""} onContextMenu={handleContextMenu}>
      <div className="chat-item">
        <button
          className="chat-select-button"
          onClick={() => selectChat(chatId)}
        >
          <span className="chat-name">{chat.chatName}</span>
          <span className={chat.unread === 0 ? "unread hide" : "unread"}>
            {chat.unread}
          </span>
        </button>
        <button className="edit-toggle" onClick={toggleEdit}>
          &#9998;
        </button>
      </div>
      {editingChat === chatId && (
        <div className="edit-popup">
          <form onSubmit={handleRename} className="rename-form">
            <input
              type="text"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              placeholder="chatname..."
              autoFocus
            />
            <div className="row">
              <button type="submit">Save</button>
              <button type="button" onClick={() => setEditingChat(null)}>
                Cancel
              </button>
            </div>
          </form>
          <div className="edit-actions">
            <button
              onClick={() =>
                confirm(
                  `are you sure you want to delete the chat: "${chat.chatName}"?`
                ) && deleteChat(chatId)
              }
              className="danger"
            >
              Delete
            </button>
            <button
              onClick={() =>
                confirm(
                  `are you sure you want to exit the chat: "${chat.chatName}"?`
                ) && exitChat(chatId)
              }
              className="danger"
            >
              Exit
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default NavigationBar;
