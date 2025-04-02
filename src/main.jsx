import { createRoot } from "react-dom/client";
import { useEffect, useState, useCallback } from "react";
import useLocalStorage from "use-local-storage";

import App from "./app.jsx";
import CreateAccount from "./comp/create-account.jsx";
import Login from "./comp/login.jsx";
import { decrypt, encrypt } from "./utils/crypto.jsx";
import installApp from "./utils/pwa.jsx";

import "./styles/import.jsx";
import "./utils/pwa.jsx";

function Main() {
  useEffect(installApp, []);

  const [auth, setAuth] = useState({ password: null, isAuth: false });
  const [encryptedData, setEncryptedData] = useLocalStorage("enc-chat-data", null);
  const [decryptedData, setDecryptedData] = useState(null);

  const handleAuth = (password, decrypted) => {
    setAuth({ password, isAuth: true });
    setDecryptedData(decrypted);
  };

  const handleCreateAccount = (e) => {
    e.preventDefault();
    const { password, password2 } = e.target;
    if (!password.value || password.value !== password2.value) {
      e.target.reset();
      return alert("Passwords do not match");
    }

    const initialData = {};
    const encrypted = encrypt(password.value, JSON.stringify(initialData));
    setEncryptedData(encrypted);
    handleAuth(password.value, initialData);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const { password } = e.target;
    if (!password.value) return alert("Incorrect password");

    try {
      const decrypted = JSON.parse(decrypt(password.value, encryptedData));
      handleAuth(password.value, decrypted);
    } catch {
      alert("Incorrect password");
    }
  };

  const updateData = useCallback(
    (newData) => {
      setDecryptedData((prev) => {
        const updatedData = typeof newData === "function" ? newData(prev) : newData;
        setEncryptedData(encrypt(auth.password, JSON.stringify(updatedData)));
        return updatedData;
      });
    },
    [auth.password, setEncryptedData]
  );

  if (encryptedData === null) return <CreateAccount handleCreateAccount={handleCreateAccount} />;
  if (!auth.isAuth) return <Login handleLogin={handleLogin} />;

  return <App data={decryptedData} setData={updateData} />;
}

createRoot(document.getElementById("root")).render(<Main />);
