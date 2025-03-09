import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import axios from "axios";

// Function to extract title from a URL (used only for non-media links)
async function fetchTitle(url) {
    try {
        const response = await axios.get(url);
        const titleMatch = response.data.match(/<title>(.*?)<\/title>/);
        return titleMatch ? titleMatch[1] : null;
    } catch (error) {
        console.error("Error fetching title:", error);
        return null;
    }
}

// Preprocess the text to wrap plain URLs with angle brackets (< >)
// so that they are auto-detected as links by ReactMarkdown.
const preprocessText = (text) => {
    // Regex finds URLs not already enclosed in < >.
    return text.replace(/(^|\s)(https?:\/\/[^\s]+)/g, "$1<$2>");
};

export default function MarkdownWithLinks({ text = "" }) {
    // Double newlines so markdown gets parsed correctly
    text = text.replaceAll("\n", "\n\n");
    const [linkTitles, setLinkTitles] = useState({});

    // Process the text once so that plain URLs become markdown links.
    const processedText = preprocessText(text);

    useEffect(() => {
        const getTitles = async () => {
            // Exclude media files as these are rendered separately.
            const mediaExtensions = [
                ".jpg", ".jpeg", ".png", ".gif",
                ".mp4", ".webm", ".ogg", ".mp3", ".wav"
            ];
            // Match URLs in the processed text.
            const links = (processedText.match(/https?:\/\/[^\s>]+/g) || []).filter(
                (link) =>
                    !mediaExtensions.some((ext) => link.toLowerCase().endsWith(ext))
            );
            if (links.length) {
                const titles = {};
                for (let link of links) {
                    const title = await fetchTitle(link);
                    if (title) {
                        titles[link] = title;
                    }
                }
                setLinkTitles(titles);
            }
        };

        getTitles();
    }, [processedText]);

    // Helper: Render a container with a clickable link on top and optional embed content below.
    const renderLinkAndEmbed = (href, children, embedContent) => (
        <div className="link-view">
            <div>
                <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                </a>
            </div>
            {embedContent && <div>{embedContent}</div>}
        </div>
    );

    // Custom renderer for links used by ReactMarkdown.
    const components = {
        a: ({ href, children }) => {
            if (!href) return <>{children}</>;

            let origin;
            try {
                origin = new URL(href).origin;
            } catch (error) {
                console.error("Invalid URL:", href);
                return (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                        {children}
                    </a>
                );
            }

            // --- YouTube Embedding ---
            if (origin.includes("youtube.com") || origin.includes("youtu.be")) {
                let videoId;
                try {
                    if (origin.includes("youtube.com")) {
                        if (href.includes("shorts")) {
                            videoId = href.split("/").pop();
                        } else {
                            videoId = new URL(href).searchParams.get("v");
                        }
                    } else {
                        videoId = href.split("/").pop();
                    }
                } catch (err) {
                    console.error("Error parsing YouTube URL:", err);
                }
                const iframeContent = videoId && (
                    <iframe
                        className="yt"
                        sandbox
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="YouTube video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                );
                return renderLinkAndEmbed(href, children, iframeContent);
            }

            // --- Facebook Embedding ---
            if (origin.includes("facebook.com") && !href.includes("messenger.com") && !href.includes("fb.me")) {
                // Construct embed URL using Facebook's plugin.
                const encodedURL = encodeURIComponent(href);
                const fbEmbedURL = `https://www.facebook.com/plugins/post.php?href=${encodedURL}&width=500`;
                const iframeContent = (
                    <iframe
                        className="facebook"
                        sandbox
                        src={fbEmbedURL}
                        title="Facebook post"
                        frameBorder="0"
                        allow="encrypted-media"
                        style={{ border: "none", overflow: "hidden", width: "500px", height: "600px" }}
                        scrolling="no"
                        allowFullScreen
                    ></iframe>
                );
                return renderLinkAndEmbed(href, children, iframeContent);
            }

            // --- Instagram Embedding ---
            if (origin.includes("instagram.com") || origin.includes("instagr.am")) {
                let postId;
                try {
                    // Expecting a URL like .../p/POST_ID/...
                    const urlObj = new URL(href);
                    const parts = urlObj.pathname.split("/");
                    const pIndex = parts.indexOf("p");
                    if (pIndex !== -1 && parts.length > pIndex + 1) {
                        postId = parts[pIndex + 1];
                    }
                } catch (e) {
                    console.error("Error parsing Instagram URL:", e);
                }
                const iframeContent = postId && (
                    <iframe
                        className="instagram"
                        sandbox
                        src={`https://www.instagram.com/p/${postId}/embed`}
                        title="Instagram post"
                        frameBorder="0"
                        allow="encrypted-media"
                        allowFullScreen
                        style={{
                            width: "400px",
                            height: "480px",
                            border: "none",
                            overflow: "hidden"
                        }}
                    ></iframe>
                );
                return renderLinkAndEmbed(href, children, iframeContent);
            }


            // --- TikTok Embedding ---
            if (origin.includes("tiktok.com")) {
                let videoId;
                try {
                    // Expecting a URL like .../video/VIDEOID or similar.
                    const parts = new URL(href).pathname.split('/');
                    videoId = parts.pop() || parts.pop(); // handles potential trailing slash
                } catch (err) {
                    console.error("Error parsing TikTok URL:", err);
                }
                const iframeContent = videoId && (
                    <iframe
                        className="tiktok"
                        sandbox
                        src={`https://www.tiktok.com/embed/${videoId}`}
                        title="TikTok video"
                        frameBorder="0"
                        allow="encrypted-media"
                        allowFullScreen
                    ></iframe>
                );
                return renderLinkAndEmbed(href, children, iframeContent);
            }

            // --- Reddit Embedding ---
            if (origin.includes("reddit.com")) {
                // Build an embed URL for Reddit posts.
                let embedURL;
                try {
                    const urlObj = new URL(href);
                    embedURL = `https://www.redditmedia.com${urlObj.pathname}?ref_source=embed&ref=share&embed=true`;
                } catch (e) {
                    console.error("Error parsing Reddit URL:", e);
                }
                const iframeContent = embedURL && (
                    <iframe
                        className="reddit"
                        sandbox
                        src={embedURL}
                        title="Reddit post"
                        frameBorder="0"
                        allow="encrypted-media"
                        allowFullScreen
                        style={{ width: "100%", height: "50dvh" }}
                    ></iframe>
                );
                return renderLinkAndEmbed(href, children, iframeContent);
            }

            // --- LinkedIn Embedding ---
            if (origin.includes("linkedin.com")) {
                // Attempt embedding if it is a LinkedIn post.
                if (href.includes("/feed/update/")) {
                    const embedURL = href.replace("/feed/update/", "/embed/feed/update/");
                    const iframeContent = (
                        <iframe
                            className="linkedin"
                            sandbox
                            src={embedURL}
                            title="LinkedIn post"
                            frameBorder="0"
                            allow="encrypted-media"
                            allowFullScreen
                            style={{ width: "500px", height: "600px" }}
                        ></iframe>
                    );
                    return renderLinkAndEmbed(href, children, iframeContent);
                }
                // Otherwise, just return the clickable link.
                return renderLinkAndEmbed(href, children, null);
            }

            // --- Telegram Embedding ---
            if (origin.includes("telegram.me") || origin.includes("t.me")) {
                // For public Telegram channels/posts, adjust URL to use the "s" (public share) version.
                let embedURL = href;
                try {
                    const urlObj = new URL(href);
                    const parts = urlObj.pathname.split('/').filter(Boolean);
                    if (parts.length >= 2) {
                        embedURL = `https://t.me/s/${parts[0]}/${parts[1]}`;
                    }
                } catch (err) {
                    console.error("Error parsing Telegram URL:", err);
                }
                const iframeContent = (
                    <iframe
                        className="telegram"
                        sandbox
                        src={embedURL}
                        title="Telegram post"
                        frameBorder="0"
                        allow="encrypted-media"
                        allowFullScreen
                        style={{ width: "500px", height: "600px" }}
                    ></iframe>
                );
                return renderLinkAndEmbed(href, children, iframeContent);
            }

            // --- WhatsApp, WeChat, Facebook Messenger ---
            // These platforms typically don't offer embeddable content via iframes.
            if (
                origin.includes("whatsapp.com") ||
                origin.includes("wechat.com") ||
                origin.includes("messenger.com") ||
                origin.includes("fb.me")
            ) {
                return renderLinkAndEmbed(href, children, null);
            }

            // --- Media Files ---
            // For images:
            if (href.match(/\.(jpeg|jpg|gif|png)$/i)) {
                const imgContent = (
                    <img src={href} alt={children} />
                );
                return renderLinkAndEmbed(href, children, imgContent);
            }
            // For videos:
            if (href.match(/\.(mp4|webm|ogg)$/i)) {
                const videoContent = (
                    <video controls>
                        <source src={href} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                );
                return renderLinkAndEmbed(href, children, videoContent);
            }
            // For audio:
            if (href.match(/\.(mp3|wav|ogg)$/i)) {
                const audioContent = (
                    <audio controls>
                        <source src={href} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                );
                return renderLinkAndEmbed(href, children, audioContent);
            }

            // --- Default Case ---
            // Render clickable link with a fetched title (if available).
            const titleText = linkTitles[href] && <p>{linkTitles[href]}</p>;
            return (
                <div className="link-view">
                    <a href={href} target="_blank" rel="noopener noreferrer">
                        {children}
                    </a>
                    {titleText}
                </div>
            );
        },
    };

    return <ReactMarkdown children={processedText} components={components} />;
}
