export default function getShareQueryParams() {
    // Check if the URL hash is "#share"
    if (window.location.hash !== "#share") return false;

    // Replace only the hash, not the entire URL
    window.history.replaceState("", "", window.location.pathname);

    // Extract query parameters using URLSearchParams
    const params = new URLSearchParams(window.location.search);

    return {
        title: params.get("title") || "No title",
        text: params.get("text") || "No text",
        url: params.get("url") || "No URL"
    };
}
