export default function getShareQueryParams() {
    // Check if the URL hash is "#share"
    if (window.location.hash !== "#share") return false;

    // Extract query parameters using URLSearchParams
    const url = new URL(window.location);
    const params = url.searchParams;

    const data = {
        title: params.get("title"),
        text: params.get("text"),
        url: params.get("url")
    };

    alert(window.location);

    // Replace only the hash, not the entire URL
    window.history.replaceState("", "", window.location.pathname);

    return data;
}