// Navigation bar to switch between chat groups
export function NavigationBar({ chats, currentChat, setCurrentChat }) {
    return (
        <nav className="nav-bar">
            <ul>
                {Object.keys(chats).map((chatId) => (
                    <li key={chatId} className={chatId === currentChat ? "active" : ""}>
                        <button onClick={() => setCurrentChat(chatId)}>{chatId}</button>
                    </li>
                ))}
            </ul>
        </nav>
    );
}