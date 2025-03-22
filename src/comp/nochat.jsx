export default function NoChat() {
  window?.setPage?.(true);
  return (
    <div className="no-chat-selected">
      <p>Please select a chat from the navigation bar or join a new chat.</p>
    </div>
  );
}
