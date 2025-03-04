import { useState } from "react";
import Html5QrcodePlugin from "./qr-code-scanner";
import { basicHash, decrypt } from "../utils/crypto";

// Component for joining a new chat room
export function JoinChat({ client, setData, setCurrentChat }) {
  const [scanQrCode, setScanQrCode] = useState(false);
  const [[chatId, password], setChatData] = useState(["", ""]);

  const handleJoin = async (e) => {
    e.preventDefault();

    const fd = new FormData(e.target);
    const chatId = fd.get("id");
    const password = fd.get("password");
    const author = fd.get("author");

    if (!chatId || !password)
      return alert(
        "Please Scan QR Code first or switch to input mode and input the group id and password."
      );

    const data = await client.get("join", {
      chatId,
      passwordHash: basicHash(basicHash(password)),
      author,
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
      },
    }));

    setCurrentChat(chatId);
    e.target.reset();
    setScanQrCode(false);
    setChatData(["", ""]);
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
