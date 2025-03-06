import { useState } from "react";
import Html5QrcodePlugin from "./qr-code-scanner";
import { basicHash, decrypt, encrypt, randomBytes } from "../utils/crypto";

import CryptoJS from "crypto-js";

// Component for joining a new chat room
export function JoinChat({ client, setData, setCurrentChat, setPage }) {
  const [scanQrCode, setScanQrCode] = useState(false);
  const [[chatId, password], setChatData] = useState(["", ""]);

  const handleJoin = async (e) => {
    e.preventDefault();

    const fd = new FormData(e.target);
    const chatName = fd.get("id");
    const chatId = basicHash(chatName);
    const password = basicHash(fd.get("password"));
    const author = fd.get("author");

    if (!chatId || !password)
      return alert(
        "Please Scan QR Code first or switch to input mode and input the group id and password."
      );

    const data = await client.get("join", {
      chatId,
      passwordHash: basicHash(basicHash(password)),
      author: encrypt(password, author),
      messageIds: {},
    });

    if (data === false) {
      alert(
        `You are in the chat: ${fd.get("id")} or your password is incorrect`
      );
      return;
    }

    setData((old) => ({
      ...old,
      [chatId]: {
        password,
        messages: data.map(({ id, message }) => {
          try {
            return { ...JSON.parse(decrypt(password, message)), id };
          } catch (error) {
            return {
              type: "error",
              data: "an error occurred (wrong password) (ignorable error)",
            };
          }
        }),
        author,
        unread: 0,
        chatName,
      },
    }));

    // Fetch and add user data.
    const users = await client.get("users", chatId);

    if (users) {
      setData((old) => {
        return {
          ...old,
          [chatId]: {
            ...old[chatId],
            messages: [
              ...old[chatId].messages,
              ...users.map((user) => {
                const author = decrypt(old[chatId].password, user);
                return {
                  type: "user-joined",
                  data: "user joined: " + author,
                  author,
                  id: randomBytes(4).toString(CryptoJS.enc.Base64),
                };
              }),
            ],
          },
        };
      });
    }

    setCurrentChat(chatId);
    e.target.reset();
    setScanQrCode(false);
    setChatData(["", ""]);

    if (setPage) setPage(false);
  };

  return !scanQrCode ? (
    <form onSubmit={handleJoin} className="join-form">
      <input
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        type="text"
        name="id"
        placeholder="Group to join..."
        required
      />
      <input
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        type="password"
        name="password"
        placeholder="Encryption password..."
        required
      />
      <input type="text" name="author" placeholder="Your name..." required />

      <button type="submit">Join Chat</button>
      <button
        type="submit"
        onClick={(e) => {
          e.preventDefault();
          setScanQrCode(true);
        }}
      >
        Scan QR Code
      </button>
    </form>
  ) : (
    <form onSubmit={handleJoin} className="join-form qr-code-form">
      <button
        type="submit"
        onClick={(e) => {
          e.preventDefault();
          setScanQrCode(false);
        }}
      >
        Input Your Data Manual
      </button>
      <Html5QrcodePlugin
        fps={10}
        qrbox={350}
        disableFlip={false}
        qrCodeSuccessCallback={(decodedText = "") => {
          const [chatId, password] = decodedText.split("\n") || ["", ""];
          if (!chatId || !password) {
            return alert("error: Invalid QR Code");
          }
          setChatData([chatId, password]);
          document.getElementById("author-input").focus();
        }}
      />
      {chatId && password && (
        <>
          <input
            type="text"
            name="id"
            placeholder="Group to join..."
            value={chatId}
            readOnly
            required
          />
          <input
            type="text"
            name="password"
            placeholder="Group Password..."
            value={password}
            readOnly
            required
          />
        </>
      )}
      <input
        type="text"
        name="author"
        id="author-input"
        placeholder="Your name..."
        required
      />
      <button type="submit">Join Chat</button>
    </form>
  );
}
