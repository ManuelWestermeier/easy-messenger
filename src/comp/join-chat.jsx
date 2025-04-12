import React, { useState } from "react";
import { basicHash, decrypt, encrypt, randomBytes } from "../utils/crypto";
import CryptoJS from "crypto-js";
import { ManualJoinForm } from "./manuel-join-form";
import { QRCodeJoinForm } from "./qr-code-join-form";

// Container component for joining a chat room
export function JoinChat({
  client,
  setData,
  setCurrentChat,
  setPage,
  data: chatDataFromProps,
}) {
  const [scanQrCode, setScanQrCode] = useState(false);
  const [[chatId, password], setChatData] = useState(["", ""]);

  const handleJoin = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const chatName = fd.get("id");
    const chatIdHashed = basicHash(chatName);
    const rawPassword = fd.get("password");
    const passwordHashed = basicHash(rawPassword);
    const author = fd.get("author");

    if (!chatIdHashed || !passwordHashed) {
      return alert(
        "Please scan QR code first or switch to input mode and input the group id and password.",
      );
    }

    if (chatDataFromProps?.[chatIdHashed]) {
      return alert("You are already in chat: " + chatName);
    }

    const data = await client.get("join", {
      chatId: chatIdHashed,
      passwordHash: basicHash(basicHash(passwordHashed)),
      author: encrypt(passwordHashed, author),
      messageIds: {},
      subscription: window.notificationSubscription,
    });

    if (data === false) {
      alert("Your password is incorrect!");
      return;
    }

    setData((old) => ({
      ...old,
      [chatIdHashed]: {
        password: passwordHashed,
        messages: data.map(({ id, message }) => {
          try {
            return { ...JSON.parse(decrypt(passwordHashed, message)), id };
          } catch (error) {
            return {
              type: "error",
              data: "An error occurred (wrong password) (ignorable error)",
            };
          }
        }),
        author,
        unread: 0,
        chatName,
        rawPassword,
        userStates: {},
        rawChatId: chatName,
      },
    }));

    // Fetch and add user data.
    const users = await client.get("users", chatIdHashed);
    if (users) {
      setData((old) => ({
        ...old,
        [chatIdHashed]: {
          ...old[chatIdHashed],
          messages: [
            ...old[chatIdHashed].messages,
            ...users.map((user) => {
              const authorDecoded = decrypt(old[chatIdHashed].password, user);
              return {
                type: "user-joined",
                data: "User joined: " + authorDecoded,
                author: authorDecoded,
                id: randomBytes(4).toString(CryptoJS.enc.Base64),
              };
            }),
          ],
        },
      }));
    }

    setCurrentChat(chatIdHashed);
    e.target.reset();
    setScanQrCode(false);
    setChatData(["", ""]);
    if (setPage) setPage(false);
  };

  // Generate a default random password for the manual form
  const defaultPassword = randomBytes(8).toString(CryptoJS.enc.Base64url);

  return (
    <div>
      {!scanQrCode ? (
        <ManualJoinForm
          handleJoin={handleJoin}
          setScanQrCode={setScanQrCode}
          defaultPassword={defaultPassword}
        />
      ) : (
        <QRCodeJoinForm
          handleJoin={handleJoin}
          setScanQrCode={setScanQrCode}
          setChatData={setChatData}
          chatData={[chatId, password]}
        />
      )}
    </div>
  );
}
