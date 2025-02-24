// Component for joining a new chat room
export function JoinChat({ client, setData, setCurrentChat }) {
    const handleJoin = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const chatId = fd.get("id");
        const password = fd.get("password");

        const error = await client.get("join", chatId);
        if (error == false) {
            alert("An error occurred while joining the chat");
            return;
        }

        setData((old) => ({
            ...old,
            [chatId]: {
                password,
                messages: [],
            }
        }));

        setCurrentChat(chatId);
        e.target.reset();
    };

    return (
        <form onSubmit={handleJoin} className="join-form">
            <input type="text" name="id" placeholder="Group to join..." required />
            <input type="password" name="password" placeholder="Encryption password..." required />
            <button type="submit">Join Chat</button>
        </form>
    );
}