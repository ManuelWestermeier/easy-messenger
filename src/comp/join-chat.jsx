// Component for joining a new chat room
export function JoinChat({ client, setData, setCurrentChat }) {
  const handleJoin = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const chatId = fd.get("id");
    const password = fd.get("password");
    const author = fd.get("author");

    const error = await client.get("join", chatId);
    if (error == false) {
      alert(`You are in the chat: ${fd.get("id")}`);
      return;
    }

    setData((old) => ({
      ...old,
      [chatId]: {
        password,
        messages: [],
        author,
      },
    }));

    setCurrentChat(chatId);
    e.target.reset();
  };

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
      />
      <input
        type="text"
        name="author"
        placeholder="Your name..."
        required
      />
      <button type="submit">Join Chat</button>
    </form>
  );
}
