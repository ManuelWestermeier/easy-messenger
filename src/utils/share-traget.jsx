export default function getShareQueryParams() {
  // Ensure the hash is exactly "#share"
  if (window.location.hash !== "#share") return null;

  const url = new URL(window.location);
  const title = url.searchParams.get("title");
  const text = url.searchParams.get("text");
  const sharedUrl = url.searchParams.get("url");

  return [
    "## Share:",
    title ? `Title: ${title}` : null,
    text ? `Text: ${text}` : null,
    sharedUrl ? `URL: ${sharedUrl}` : null,
  ]
    .filter(Boolean) // Remove null values
    .join("\n");
}