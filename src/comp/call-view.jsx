export default function CallView({ setIsCalling, client, password, chatId }) {
  return (
    <div className="call-view">
      CallView
      <button
        className="danger"
        onClick={(e) => {
          e.preventDefault();
          setIsCalling(false);
        }}
      >
        Exit
      </button>
      <button>Mute</button>
      <button>Kamera</button>
    </div>
  );
}
