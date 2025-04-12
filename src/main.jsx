import { createRoot } from "react-dom/client";
import { useEffect, useState, useCallback } from "react";
import useLocalStorage from "use-local-storage";

import App from "./app.jsx";
import CreateAccount from "./comp/create-account.jsx";
import Login from "./comp/login.jsx";
import { basicHash, decrypt, encrypt } from "./utils/crypto.jsx";
import installApp from "./utils/pwa.jsx";

import "./styles/import.jsx";
import "./utils/pwa.jsx";

const bc = new BroadcastChannel("LOCAL_STORAGE_SYNC");

function Main() {
  useEffect(installApp, []);

  const [username] = useLocalStorage("last-username", "admin");
  const [auth, setAuth] = useState({ password: null, isAuth: false });
  const [data, setData] = useState(null);

  const storageKey = username ? `enc-chat-data-${basicHash(username)}` : null;

  const handleCreateAccount = (e) => {
    e.preventDefault();
    const { username, password, password2 } = e.target;
    if (!username.value && storageKey) {
      return alert("Username is required");
    }
    if (!password.value || password.value !== password2.value) {
      e.target.reset();
      return alert("Passwords do not match");
    }
    const encrypted = encrypt(password.value, JSON.stringify({}));
    setData({});
    localStorage.setItem(storageKey, encrypted);
    setAuth({ password: password.value, isAuth: true });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const { username, password } = e.target;
    if (!username.value || !password.value) {
      return alert("Please fill in all fields");
    }
    const storedEncryptedData = localStorage.getItem(storageKey);
    if (!storedEncryptedData) {
      return handleCreateAccount(e);
    }

    try {
      const decrypted = JSON.parse(
        decrypt(password.value, storedEncryptedData),
      );
      setData(decrypted);
      setAuth({
        isAuth: true,
        password: password.value,
      });
    } catch {
      alert("Incorrect password");
    }
  };

  const updateData = (newData) => {
    setData((prev) => {
      const updatedData =
        typeof newData === "function" ? newData(prev) : newData;

      const encrypted = encrypt(auth.password, JSON.stringify(updatedData));
      localStorage.setItem(storageKey, encrypted);
      bc.postMessage(updatedData);

      return updatedData;
    });
  };

  bc.onmessage = (e) => {
    setData(e.data);
  };

  // if the key isnt set in local storage
  if (!Object.prototype.hasOwnProperty.call(localStorage, storageKey)) {
    return <CreateAccount handleCreateAccount={handleCreateAccount} />;
  }

  if (!auth.isAuth || !data) {
    return <Login handleLogin={handleLogin} />;
  }

  return <App data={data} setData={updateData} />;
}

createRoot(document.getElementById("root")).render(<Main />);
