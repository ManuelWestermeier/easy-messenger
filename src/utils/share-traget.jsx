export default function getShareQueryParams() {
    if (window.location.hash != "#share") return false;
    window.history.replaceState("", "", "/easy-messenger/");
    const params = new URLSearchParams(window.location.search);
    return {
        title: params.get("title") || "No title",
        text: params.get("text") || "No text",
        url: params.get("url") || "No URL"
    };
}