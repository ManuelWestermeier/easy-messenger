import React from "react";

export default function Login({ handleLogin }) {
  return (
    <>
      <fieldset className="login">
        <legend>
          <h1>Login</h1>
        </legend>
        <form onSubmit={handleLogin} className="form">
          <p>
            Password:
            <input
              type="password"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              autoFocus
              placeholder="Enter password..."
              name="password"
              className="input"
            />
          </p>
          <p id="error" className="error"></p>
          <button type="submit" className="button">
            Login
          </button>
        </form>
      </fieldset>
      <div className="opensource-info">
        <img
          src="https://manuelwestermeier.github.io/easy-messenger/img/logo-512.png"
          alt="Logo"
        />
        <h2>Open Source & Ultra Secure</h2>
        <p>
          Our messenger is designed with your security in mind. All data is
          encrypted directly on your device, ensuring that no sensitive
          information is ever sent to our servers. This open-source project is
          hosted on&nbsp;
          <a
            href="https://github.com/ManuelWestermeier/easy-messenger/"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          , making it fully transparent and, we believe, the securest messenger
          available – even governments can’t hack it!
        </p>
      </div>
    </>
  );
}
