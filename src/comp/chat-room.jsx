import { encrypt, randomBytes } from "../utils/crypto";

// Component for displaying and sending messages in a chat room
export function ChatRoom({ chatId, chatData, client, setData }) {
    const handleSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const message = {
            type: fd.get("type"),
            data: fd.get("text"),
            id: randomBytes(4),
            author: fd.get("author"),
            date: new Date().toLocaleDateString(),
        };

        // Update local state with the new message
        setData((old) => ({
            ...old,
            [chatId]: {
                ...old[chatId],
                messages: [...old[chatId].messages, message]
            }
        }));

        const isSent = await client.get("send", {
            id: chatId,
            message: encrypt(chatData.password, JSON.stringify(message)),
        });

        if (!isSent) {
            alert("A send error occurred");
        }
        e.target.reset();
    };

    return (
        <div className="chat-room">
            <h3>Chat: {chatId}</h3>
            <div className="messages">
                {chatData.messages.map((msg, index) => (
                    <div key={index} className="message">
                        <p>{msg.data}</p>
                        <p className="meta">
                            {msg.date} | {msg.author}
                        </p>
                    </div>
                ))}
            </div>
            <form onSubmit={handleSubmit} className="message-form">
                <select name="type">
                    <option value="text">Text</option>
                </select>
                <input type="text" name="text" placeholder="Type your message..." required />
                <input type="text" name="author" placeholder="Your name..." required />
                <button type="submit">Send</button>
            </form>
        </div>
    );
}