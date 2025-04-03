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
          className={"chat-select-button " + (chat.isCalling ? "calling" : "")}
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
              <button type="submit" title="Save">
                Save
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#e8eaed"
                >
                  <path d="M840-680v480q0 33-23.5 56.5T760-120H200q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h480l160 160Zm-80 34L646-760H200v560h560v-446ZM480-240q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35ZM240-560h360v-160H240v160Zm-40-86v446-560 114Z" />
                </svg>
              </button>
              <button
                title="Cancel"
                type="button"
                onClick={() => setEditingChat(null)}
              >
                Cancel
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#e8eaed"
                >
                  <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                </svg>
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
              title="Delete"
            >
              Delete
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#e8eaed"
              >
                <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
              </svg>
            </button>
            <button
              onClick={() =>
                confirm(
                  `are you sure you want to exit the chat: "${chat.chatName}"?`
                ) && exitChat(chatId)
              }
              title="Exit"
              className="danger"
            >
              Exit
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#e8eaed"
              >
                <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default NavigationBar;
