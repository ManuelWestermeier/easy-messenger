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
  authorUser,
  react,
  id,
}) {
  const [seeComments, setSeeComments] = useState(comments?.length != 0);

  useEffect(() => {
    if (comments?.length > 0 && !seeComments) setSeeComments(true);
  }, [comments?.length]);

  const isUserMessage = userMessageTypes.includes(type);

  return (
    <div className="menu-active">
      {react && (
        <div
          className="reaction-text"
          onClick={(e) => {
            e.preventDefault();
            const messageElem = document.getElementById(react[0]);
            if (!messageElem) return;

            messageElem.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            console.log(messageElem);

            messageElem.classList.add("focus");
            setTimeout(() => messageElem.classList.remove("focus"), 1500);
          }}
          style={{
            backgroundColor:
              react[1].author != authorUser
                ? userColors[react[1].author]
                : "var(--own-msg-bg)",
            padding: "5px",
            borderRadius: "5px",
            height: "30px",
            cursor: "pointer",
          }}
        >
          <b>{react[1].author}</b>:{" "}
          <span>
            <i>{react[1].data}</i>
          </span>
        </div>
      )}
      <div>
        {Array.from(data).length > 5 ? (
          <MarkdownWithLinks text={data} />
        ) : (
          <span
            style={{
              fontSize: (14 - 2.2 * Array.from(data).length) * 0.5 + "rem",
            }}
          >
            {data}
          </span>
        )}
      </div>
      {seeComments && isUserMessage && (
        <fieldset className="comments">
          <legend>Comments</legend>
          {comments.map(({ author, data, date, id }) => {
            // Generate a random color for the user if they don't have one already.
            if (!userColors[author]) {
              userColors[author] = `rgb(${Math.floor(
                Math.random() * 100 + 50
              )}, ${Math.floor(Math.random() * 100 + 50)}, ${Math.floor(
                Math.random() * 100 + 50
              )})`;
            }

            return (
              <div
                style={{
                  backgroundColor:
                    authorUser != author
                      ? userColors[author]
                      : "var(--own-msg-bg)",
                }}
                className="comment"
                key={id}
              >
                <div>
                  <MarkdownWithLinks text={data} />
                </div>
                <div>
                  <b>
                    <span>{author}</span>
                  </b>{" "}
                  <i>
                    <span>{date}</span>
                  </i>
                </div>
              </div>
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
            <button type="submit" title="Send">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#e8eaed"
              >
                <path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z" />
              </svg>
            </button>
          </form>
        </fieldset>
      )}
      {isUserMessage && (
        <div className="menu">
          <button
            title="delete message"
            className="danger"
            onClick={deleteMessage}
          >
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
          <button
            title="Reply"
            onClick={(e) => {
              e.preventDefault();
              window?.setReactId?.(id);
              document.querySelector(".message-form textarea").focus();
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#e8eaed"
            >
              <path d="M760-200v-160q0-50-35-85t-85-35H273l144 144-57 56-240-240 240-240 57 56-144 144h367q83 0 141.5 58.5T840-360v160h-80Z" />
            </svg>
          </button>
          <button
            title="share with other groups"
            onClick={(e) => {
              e.preventDefault();
              window.setShareData?.(`Date: ${data} Author: ${author}
                Message: ${data}
                comments:" ${comments
                  .map((data) => `${data.author}: ${data.data}; ${data.date}`)
                  .join("\n")}`);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#e8eaed"
            >
              <path d="M320-280 80-520l240-240 57 56-184 184 184 184-57 56Zm480 80v-160q0-50-35-85t-85-35H433l144 144-57 56-240-240 240-240 57 56-144 144h247q83 0 141.5 58.5T880-360v160h-80Z" />
            </svg>
          </button>
        </div>
      )}
      <p className="meta">
        <i>
          <span>{date}</span>
        </i>{" "}
        <b>
          <span>{author}</span>
        </b>{" "}
        <i>
          <span>[{type}]</span>
        </i>
      </p>
    </div>
  );
}
