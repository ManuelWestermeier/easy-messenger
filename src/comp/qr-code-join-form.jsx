import React from "react";
import Html5QrcodePlugin from "./qr-code-scanner";

export function QRCodeJoinForm({
  handleJoin,
  setScanQrCode,
  setChatData,
  chatData,
}) {
  // chatData is expected to be an array: [chatId, password]
  return (
    <form onSubmit={handleJoin} className="join-form qr-code-form">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setScanQrCode(false);
        }}
      >
        Input Your Data Manual
      </button>
      <Html5QrcodePlugin
        qrCodeSuccessCallback={(decodedText = "") => {
          const [chatId, password] = decodedText.split("\n") || ["", ""];
          if (!chatId || !password) {
            return alert("Error: Invalid QR Code");
          }
          setChatData([chatId, password]);
          alert("QR code detected...input your username");
          document.getElementById("author-input").focus();
        }}
      />
      {chatData[0] && chatData[1] && (
        <>
          <input
            type="text"
            name="id"
            placeholder="Group to join..."
            value={chatData[0]}
            readOnly
            required
          />
          <input
            type="text"
            name="password"
            placeholder="Group Password..."
            value={chatData[1]}
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