export default function MessageConetent({ author, data, date, type }) {
  return (
    <>
      <p>{data}</p>
      <p className="meta">
        <i>
          <b>
            <span>{date}</span> <span>{author}</span> <span>[{type}]</span>
          </b>
        </i>
      </p>
    </>
  );
}
