import React from "react";

export function ManualJoinForm({ handleJoin, setScanQrCode, defaultPassword }) {
  return (
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
        defaultValue={defaultPassword}
        onFocus={(e) => {
          e.target.type = "text";
        }}
        onBlur={(e) => {
          e.target.type = "password";
        }}
      />
      <input type="text" name="author" placeholder="Your name..." required />
      <button type="submit">Join Chat</button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setScanQrCode(true);
        }}
      >
        Scan QR Code
      </button>
    </form>
  );
}
