export default function getShareQueryParams() {
    // Check if the URL hash is "#share"
    if (window.location.hash !== "#share") return false;

    const url = new URL(window.location);

    // Extract query parameters using URLSearchParams
    return {
        title: url.searchParams.get("title"),
        text: url.searchParams.get("text"),
        url: url.searchParams.get("url")
    };
}