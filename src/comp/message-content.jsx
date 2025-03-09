import { useEffect, useState } from "react";
import { userColors, userMessageTypes } from "./message";
import MarkdownWithLinks from "./markdown-with-links";

export default function MessageConetent({
  author,
  data,
  date,
  type,
  comments,
  addComment,
  deleteMessage,
  authorUser
}) {
  const [seeMenu, setSeeMenu] = useState(false);
  const [seeComments, setSeeComments] = useState(comments?.length != 0);


  useEffect(() => {
    if (comments?.length > 0 && !seeComments) setSeeComments(true);
  }, [comments?.length]);

  if (seeComments && !seeMenu) setSeeMenu(true);

  const isUserMessage = userMessageTypes.includes(type);

  return (
    <div onClick={() => setSeeMenu(true)} className={seeMenu ? "menu-active" : ""}>
      <div><MarkdownWithLinks text={data} /></div>
      {seeComments && isUserMessage && (
        <fieldset className="comments">
          <legend>Comments</legend>
          {comments.map(({ author, data, date, id }) => {
            // Generate a random color for the user if they don't have one already.
            if (!userColors[author]) {
              userColors[msg.author] = `rgb(${Math.floor(
                Math.random() * 100 + 50
              )}, ${Math.floor(Math.random() * 100 + 50)}, ${Math.floor(
                Math.random() * 100 + 50
              )})`;
            }

            return (
              <p
                style={{ backgroundColor: authorUser != author ? userColors[author] : "var(--own-msg-bg)" }}
                className="comment" key={id}>
                <div>
                  <MarkdownWithLinks text={data} />
                </div>
                <div>
                  <b><span>{author}</span></b> <i><span>{date}</span></i>
                </div>
              </p>
            );
          })}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              addComment(fd.get("data"));
              e.target.reset();
            }}
          >
            <input type="text" name="data" placeholder="comment..." />
            <button type="submit" title="Send"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z" /></svg></button>
          </form>
        </fieldset>
      )}
      {seeMenu && isUserMessage && (
        <div className="menu">
          <button title="delete message" className="danger" onClick={deleteMessage}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#e8eaed"
            >
              <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
            </svg>
          </button>
          <button
            title="View Comments"
            onClick={() => setSeeComments((o) => !o)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#e8eaed"
            >
              <path d="M240-400h480v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM880-80 720-240H160q-33 0-56.5-23.5T80-320v-480q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v720ZM160-320h594l46 45v-525H160v480Zm0 0v-480 480Z" />
            </svg>
            ({comments.length})
          </button>
        </div>
      )}
      <p className="meta">

        <i><span>{date}</span></i> <b><span>{author}</span></b> <i><span>[{type}]</span></i>

      </p>
    </div>
  );
}
