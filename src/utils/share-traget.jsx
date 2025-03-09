export default function getShareQueryParams() {
    // Check if the URL hash is "#share"
    if (window.location.hash !== "#share") return false;

    const url = new URL(window.location);

    let out = "";

    if (url.searchParams.get("title") != "") {
        out += `Title: ${url.searchParams.get("title")}`;
    }
    if (url.searchParams.get("text") != "") {
        out += `Text: ${url.searchParams.get("text")}`;
    }
    if (url.searchParams.get("url") != "") {
        out += `URL: ${url.searchParams.get("url")}`;
    }

    return out || false;
}