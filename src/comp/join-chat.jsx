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
    const rawPassword = fd.get("password");
    const password = basicHash(rawPassword);
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
      subscription: window.notificationSubscription,
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
        rawPassword,
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

      <button type="submit"><svg xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "5px" }} height="18px" viewBox="0 -960 960 960" width="18px" fill="#e8eaed"><path d="M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113ZM120-240h480v-32q0-11-5.5-20T580-306q-54-27-109-40.5T360-360q-56 0-111 13.5T140-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T440-640q0-33-23.5-56.5T360-720q-33 0-56.5 23.5T280-640q0 33 23.5 56.5T360-560Zm0 320Zm0-400Z" /></svg> Join Chat</button>
      <button
        type="submit"
        onClick={(e) => {
          e.preventDefault();
          setScanQrCode(true);
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "5px" }} height="18px" viewBox="0 -960 960 960" width="18px" fill="#e8eaed"><path d="M80-680v-200h200v80H160v120H80Zm0 600v-200h80v120h120v80H80Zm600 0v-80h120v-120h80v200H680Zm120-600v-120H680v-80h200v200h-80ZM700-260h60v60h-60v-60Zm0-120h60v60h-60v-60Zm-60 60h60v60h-60v-60Zm-60 60h60v60h-60v-60Zm-60-60h60v60h-60v-60Zm120-120h60v60h-60v-60Zm-60 60h60v60h-60v-60Zm-60-60h60v60h-60v-60Zm240-320v240H520v-240h240ZM440-440v240H200v-240h240Zm0-320v240H200v-240h240Zm-60 500v-120H260v120h120Zm0-320v-120H260v120h120Zm320 0v-120H580v120h120Z" /></svg>
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
