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
    // This regex finds URLs that are not already enclosed in < >.
    // It replaces any standalone URL (preceded by start-of-line or whitespace)
    // with the URL wrapped in angle brackets.
    return text.replace(/(^|\s)(https?:\/\/[^\s]+)/g, "$1<$2>");
};

export default function MarkdownWithLinks({ text = "" }) {
    text = text.replaceAll("\n", "\n\n");
    const [linkTitles, setLinkTitles] = useState({});

    // Process the text once so that plain URLs become markdown links.
    const processedText = preprocessText(text);

    useEffect(() => {
        const getTitles = async () => {
            // Exclude media links since these are rendered separately.
            const mediaExtensions = [
                ".jpg",
                ".jpeg",
                ".png",
                ".gif",
                ".mp4",
                ".webm",
                ".ogg",
                ".mp3",
                ".wav",
            ];
            // Use a regex that matches URLs in the processed text.
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
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {children}
                </a>
            </div>
            {embedContent && (
                <div>
                    {embedContent}
                </div>
            )}
        </div>
    );

    // Custom renderer for links using the "a" key for ReactMarkdown.
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

            // For YouTube: render a sandboxed iframe (with no JS enabled) below the clickable link.
            if (origin.includes("youtube.com") || origin.includes("youtu.be")) {
                let videoId;
                try {
                    if (origin.includes("youtube.com")) {
                        videoId = new URL(href).searchParams.get("v");
                    } else {
                        videoId = href.split("/").pop();
                    }
                } catch (err) {
                    console.error("Error parsing YouTube URL:", err);
                }
                const iframeContent =
                    videoId && (
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

            // For Twitter and Instagram: render only a clickable link.
            if (origin.includes("twitter.com") || origin.includes("instagram.com")) {
                return renderLinkAndEmbed(href, children, null);
            }

            // For image URLs: render an <img> tag as the embed content.
            if (href.match(/\.(jpeg|jpg|gif|png)$/i)) {
                const imgContent = (
                    <img
                        src={href}
                        alt={children}
                    />
                );
                return renderLinkAndEmbed(href, children, imgContent);
            }

            // For video URLs: render a <video> element.
            if (href.match(/\.(mp4|webm|ogg)$/i)) {
                const videoContent = (
                    <video controls>
                        <source src={href} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                );
                return renderLinkAndEmbed(href, children, videoContent);
            }

            // For audio URLs: render an <audio> element.
            if (href.match(/\.(mp3|wav|ogg)$/i)) {
                const audioContent = (
                    <audio controls>
                        <source src={href} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                );
                return renderLinkAndEmbed(href, children, audioContent);
            }

            // Default: render the clickable link with a fetched title (if available).
            const titleText = linkTitles[href] && <p>{linkTitles[href]}</p>;
            return (
                <div className="link-view">
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {children}
                    </a>
                    {titleText}
                </div>
            );
        },
    };

    return <ReactMarkdown children={processedText} components={components} />;
}
