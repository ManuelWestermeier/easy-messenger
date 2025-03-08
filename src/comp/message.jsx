import CryptoJS from "crypto-js";

import { encrypt, randomBytes } from "../utils/crypto";
import MessageConetent from "./message-content";

export const userColors = {};

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

  const deleteMessage = async (e) => {
    e.preventDefault();

    const isSent = await client.get("delete-message", {
      id: msg.id,
      chatId,
    });

    if (!isSent) alert("error: message isn't deleted");

    const messages = chatData.messages;

    for (const _msg of messages) {
      if (_msg.type == "update") {
        const [reactId] = _msg.data;

        if (reactId == msg.id) {
          const isSent = await client.get("delete-message", {
            chatId,
            id: _msg.id,
          });

          if (!isSent) alert("error: message isn't deleted");
        }
      }
    }

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
  };

  const addComment = async (comment) => {
    const message = {
      data: [
        msg.id,
        "comment",
        {
          author: chatData.author,
          data: comment,
          date: new Date().toLocaleString(),
          id: randomBytes(2).toString(CryptoJS.enc.Hex),
        },
      ],
      type: "update",
    };
    const messageId = randomBytes(4).toString(CryptoJS.enc.Hex);
    const isSent = await client.get("send", {
      chatId,
      message: encrypt(chatData.password, JSON.stringify(message)),
      id: messageId,
    });

    setData((old) => {
      const editMsgIndex = old[chatId].messages.findIndex(
        ({ id }) => id == message.data[0]
      );

      if (editMsgIndex != -1)
        old[chatId].messages[editMsgIndex].comments.push(message.data[2]);

      return {
        ...old,
        [chatId]: {
          ...old[chatId],
          messages: [...old[chatId].messages, { ...message, id: messageId }],
        },
      };
    });

    if (!isSent) {
      alert("A send error occurred");
    }
  };

  return (
    <div
      id={msg.id}
      key={index}
      style={{ backgroundColor: userColors[msg.author] }}
      className={"message " + className}
    // onContextMenu={}
    >
      <MessageConetent
        {...msg}
        deleteMessage={deleteMessage}
        addComment={addComment}
        authorUser={chatData.author}
      />
    </div>
  );
}
