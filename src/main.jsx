import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { useEffect, useState } from "react";
import useLocalStorage from "use-local-storage";
import { decrypt, encrypt } from "./utils/crypto.jsx";

function Main() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js").then(() => {
        console.log("Service Worker Registered");
      });
    }
  }, []);

  const [password, setPassword] = useState(null);
  const [data, setData] = useLocalStorage("enc-chat-data", null);
  const [isAuth, setIsAuth] = useState(false);

  // Handler for creating an account
  const handleCreateAccount = (e) => {
    e.preventDefault();
    const inputPassword = e.target.password.value;
    if (!inputPassword) return; // Optionally display an error
    setPassword(inputPassword);
    // Encrypt an empty JSON string to start with
    const encryptedData = encrypt(inputPassword, "{}");
    setData(encryptedData);
    setIsAuth(true);
  };

  // Handler for logging in
  const handleLogin = (e) => {
    e.preventDefault();
    const inputPassword = e.target.password.value;
    if (!inputPassword) return alert("Incorrect password");
    try {
      // Attempt to decrypt stored data using the provided password.
      const decryptedData = decrypt(inputPassword, data);
      // Validate that the decrypted data is valid JSON.
      JSON.parse(decryptedData);
    } catch (error) {
      alert("Incorrect password");
      return;
    }
    setPassword(inputPassword);
    setIsAuth(true);
  };

  // A wrapper to update the data and automatically encrypt the new value.
  const updateData = (newData) => {
    if (typeof newData === "function") {
      setData((prevData) =>
        encrypt(
          password,
          JSON.stringify(newData(JSON.parse(decrypt(password, prevData))))
        )
      );
    } else {
      setData(encrypt(password, JSON.stringify(newData)));
    }
  };

  // Define a reusable login form.
  const loginHtml = (
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
  );

  // Define a reusable create account form.
  const createAccountHtml = (
    <fieldset className="login">
      <legend>
        <h1>Create Account</h1>
      </legend>
      <form onSubmit={handleCreateAccount} className="form">
        <p>
          Password:
          <input
            type="password"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            placeholder="Enter password..."
            name="password"
            className="input"
          />
        </p>
        <p id="error" className="error"></p>
        <button type="submit" className="button">
          Create Account
        </button>
      </form>
    </fieldset>
  );

  // If no account exists, show the create account form.
  if (data === null) {
    return createAccountHtml;
  }

  // If the user exists but is not authenticated, show the login form.
  if (!isAuth) {
    return loginHtml;
  }

  const dataString = decrypt(password, data);
  // If authenticated, render the main app.
  return <App data={JSON.parse(dataString)} setData={updateData} />;
}

createRoot(document.getElementById("root")).render(<Main />);
