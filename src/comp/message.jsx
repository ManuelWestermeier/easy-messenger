const userColors = {};

export default function Message({ chatData, msg, index }) {
  // Generate a random color for the user if they don't have one already.
  if (!userColors[msg.author]) {
    userColors[msg.author] = `rgb(${Math.floor(
      Math.random() * 100 + 50
    )}, ${Math.floor(Math.random() * 100 + 50)}, ${Math.floor(
      Math.random() * 100 + 50
    )})`;
  }

  return (
    <div
      key={index}
      style={{ backgroundColor: userColors[msg.author] }}
      className={
        "message" + (msg.author == chatData.author ? " own-msg" : " other")
      }
    >
      <p>{msg.data}</p>
      <p className="meta">
        {msg.date} | {msg.author}
      </p>
    </div>
  );
}
