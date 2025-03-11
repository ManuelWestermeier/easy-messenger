export default function getShareQueryParams() {
  // Check if the URL hash is "#share"
  if (window.location.hash !== "#share") return false;

  const url = new URL(window.location);

  let out = "## Share:";

  if (url.searchParams.get("title")) {
    out += `\nTitle: ${url.searchParams.get("title")}`;
  }
  if (url.searchParams.get("text")) {
    out += `\nText: ${url.searchParams.get("text")}`;
  }
  if (url.searchParams.get("url")) {
    out += `\nURL: ${url.searchParams.get("url")}`;
  }

  return out;
}
