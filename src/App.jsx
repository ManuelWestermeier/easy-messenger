import { useClient } from "wsnet-client-react"
import Client from "wsnet-client"
import { useState } from "react"
import { decrypt, encrypt, randomBytes } from "./utils/crypto";

export default function App() {
  const [data, setData] = useState({});
  const [client, state, reCreateClient, isClosed] = useClient(
    () => {
      const client = new Client("ws://localhost:8080");

      client.onSay("message", ({ id, message }) => {
        setData(old => {
          let messageData;
          try {
            messageData = decrypt(old[id].password, message);
          } catch (error) {
            messageData = { type: "error", data: "wrrong key" };
          }

          return {
            ...old,
            [id]: {
              ...old[id],
              messages: [...old[id].messages, JSON.parse(messageData)]
            }
          }
        });
      });

      return client
    }, true, true
  )

  if (state == "failed" || isClosed)
    return <button onClick={() => reCreateClient()}>
      Reconect
    </button>

  if (client == null)
    return state

  return <>
    {Object.keys(data).map(key => {
      return <fieldset key={key}>
        <legend>
          <h3>Name: {key}</h3>
        </legend>
        <div className="messages">
          {data[key].messages.map(msg => {
            return <div key={data.id}>
              <p>
                {msg.data}
              </p>
              <p>
                <span>
                  {msg.date}|
                  {msg.author}
                </span>
              </p>
            </div>
          })}
        </div>
        <form onSubmit={async e => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const message = {
            type: fd.get("type"),
            data: fd.get("text"),
            id: randomBytes(4),
            author: fd.get("author"),
            date: new Date().toLocaleDateString(),
          }

          setData(old => {
            return {
              ...old,
              [key]: {
                ...old[key],
                messages: [...old[key].messages, message]
              }
            }
          })

          const isSended = await client.get("send", {
            id: key,
            message: encrypt(data[key].password, JSON.stringify(message)),
          });
          if (!isSended) {
            alert("a send error occured");
          }
        }}>
          <select name="type">
            <option value="text">Text</option>
          </select>
          <input type="text" name="text" placeholder="text..." />
          <input type="text" name="author" placeholder="author..." />
          <button type="submit">Send</button>
        </form>
      </fieldset>
    })}
    <form onSubmit={async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const error = await client.get("join", fd.get("id"));
      if (error) return alert("an error has occured");
      setData(old => {
        return {
          ...old,
          [fd.get("id")]: {
            password: fd.get("password"),
            messages: [],
          }
        }
      })
    }}>
      <input type="text" placeholder="group to join..." name="id" />
      <input type="password" placeholder="encryption password..." name="id" />
      <button type="submit">
        Join
      </button>
    </form>
  </>;
}