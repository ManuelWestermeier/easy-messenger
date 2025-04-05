import React from "react";
import useLocalStorage from "use-local-storage";

export function ManualJoinForm({ handleJoin, setScanQrCode, defaultPassword }) {
  const [defaultAuth, setDefaultAuth] = useLocalStorage("default-auth-", "");

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
      <input
        type="text"
        name="author"
        defaultValue={defaultAuth}
        onChange={e => setDefaultAuth(e.target.value)}
        placeholder="Your name..."
        required
      />
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
