import { createRoot } from "react-dom/client";
import App from "./app.jsx";
import { useEffect, useState, useCallback } from "react";
import useLocalStorage from "use-local-storage";
import { decrypt, encrypt } from "./utils/crypto.jsx";
import "./styles/import.jsx";
import "./utils/pwa.jsx";
import CreateAccount from "./comp/create-account.jsx";
import Login from "./comp/login.jsx";
import installApp from "./utils/pwa.jsx";

function Main() {
  useEffect(installApp, []);

  const [password, setPassword] = useState(null);
  const [storedData, setStoredData] = useLocalStorage("enc-chat-data", null);
  const [isAuth, setIsAuth] = useState(false);
  const [decryptedData, setDecryptedData] = useState(null);

  useEffect(() => {
    if (password && storedData) {
      try {
        const decrypted = decrypt(password, storedData);
        setDecryptedData(JSON.parse(decrypted));
      } catch {
        alert("Incorrect password");
        setIsAuth(false);
      }
    }
  }, [password, storedData]);

  const handleCreateAccount = (e) => {
    e.preventDefault();
    const inputPassword = e.target.password.value;
    const inputPassword2 = e.target.password2.value;
    if (!inputPassword || !inputPassword2) return;
    if (inputPassword !== inputPassword2) {
      e.target.reset();
      return alert("Wrong password");
    }
    setPassword(inputPassword);
    const encryptedData = encrypt(inputPassword, "{}");
    setStoredData(encryptedData);
    setDecryptedData({});
    setIsAuth(true);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const inputPassword = e.target.password.value;
    if (!inputPassword) return alert("Incorrect password");
    try {
      const decrypted = decrypt(inputPassword, storedData);
      setPassword(inputPassword);
      setDecryptedData(JSON.parse(decrypted));
      setIsAuth(true);
    } catch {
      alert("Incorrect password");
    }
  };

  const updateData = useCallback((newData) => {
    setDecryptedData((prevData) => {
      const updatedData = typeof newData === "function" ? newData(prevData) : newData;
      if (JSON.stringify(updatedData) !== JSON.stringify(prevData)) {
        setStoredData(encrypt(password, JSON.stringify(updatedData)));
      }
      return updatedData;
    });
  }, [password]);

  if (storedData === null) return <CreateAccount handleCreateAccount={handleCreateAccount} />;
  if (!isAuth) return <Login handleLogin={handleLogin} />;

  return <App data={decryptedData} setData={updateData} />;
}

createRoot(document.getElementById("root")).render(<Main />);
