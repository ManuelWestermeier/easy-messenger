import { useState } from "react";
import { userMessageTypes } from "./message";

export default function MessageConetent({
  author,
  data,
  date,
  type,
  comments,
  addComment,
  deleteMessage,
}) {
  const [seeMenu, setSeeMenu] = useState(false);
  const [seeComments, setSeeComments] = useState(comments?.length != 0);

  if (comments?.length > 0 && !seeComments) setSeeComments(true);

  const isUserMessage = userMessageTypes.includes(type);

  return (
    <div onClick={() => setSeeMenu(true)}>
      <p>{data}</p>
      {seeComments && isUserMessage && (
        <fieldset className="comments">
          <legend>Comments</legend>
          {comments.map(({ author, data, date, id }) => {
            return (
              <p key={id}>
                {data} ({author}) ({date})
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
            <button type="submit">Send</button>
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
        <b>
          <span>{date}</span> <span>{author}</span> <span>[{type}]</span>
        </b>
      </p>
    </div>
  );
}
