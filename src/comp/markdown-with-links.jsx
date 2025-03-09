import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import axios from "axios";

function TryImg({ src, alt, alternative, style, ...data }) {
    const [render, setRender] = useState(true)

    if (!render && alternative) {
        return alternative;
    }

    return <img
        {...data}
        src={src}
        style={{
            ...style,
            display: render ? style?.display || "block" : "none"
        }}
        alt={alt}
        onError={e => {
            e.preventDefault();
            setRender(false);
        }}
    />;
} 1

// Import the social media embed components
import {
    FacebookEmbed,
    InstagramEmbed,
    LinkedInEmbed,
    PinterestEmbed,
    TikTokEmbed,
    XEmbed,
    YouTubeEmbed,
} from "react-social-media-embed";
import { TelegramEmbed } from "react-telegram-embed";

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
    return text.replace(/(^|\s)(https?:\/\/[^\s]+)/g, "$1<$2>");
};

export default function MarkdownWithLinks({ text = "" }) {
    text = text.replaceAll("\n", "\n\n");
    const [linkTitles, setLinkTitles] = useState({});
    const processedText = preprocessText(text);

    useEffect(() => {
        const getTitles = async () => {
            const mediaExtensions = [
                ".jpg", ".jpeg", ".png", ".gif",
                ".mp4", ".webm", ".ogg", ".mp3", ".wav"
            ];
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

    const renderLinkAndEmbed = (origin, href, children, embedContent) => {
        const [see, setSee] = useState(false);

        return <div className="link-view">
            <div>
                <a style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }} href={href} target="_blank" rel="noopener noreferrer">
                    <TryImg alt="Logo" style={{ width: "32px", height: "32px", objectFit: "contain", backgroundColor: "transparent" }} src={origin + "/favicon.ico"} />
                    {linkTitles[href] && <span>
                        {linkTitles[href]}
                    </span>}
                    <span>
                        {children}
                    </span>
                </a>
                <button style={{ marginBottom: see ? "5px" : "" }} onClick={_ => setSee(p => !p)}>
                    {!see ? "See" : "Hide"}
                </button>
            </div>

            {embedContent && see && <div>{embedContent}</div>}
        </div>;
    }

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

            // Facebook
            if (origin.includes("facebook.com") && !href.includes("messenger.com") && !href.includes("fb.me")) {
                return renderLinkAndEmbed(origin, href, children, (
                    <FacebookEmbed url={href} width={"100%"} height="auto" />
                ));
            }

            // Instagram
            if (origin.includes("instagram.com") || origin.includes("instagr.am")) {
                return renderLinkAndEmbed(origin, href, children, (
                    <InstagramEmbed
                        url={href}
                        height="auto"
                        width="100%"
                        hideCaption={false}
                        containerTagName="div"
                        protocol=""
                        injectScript
                    />
                ));
            }

            // LinkedIn
            if (origin.includes("linkedin.com")) {
                return renderLinkAndEmbed(origin, href, children, (
                    <LinkedInEmbed
                        url={href}
                        postUrl={href}
                        height="auto"
                        width="100%"
                    />
                ));
            }

            // Pinterest
            if (origin.includes("pinterest.com")) {
                return renderLinkAndEmbed(origin, href, children, (
                    <PinterestEmbed
                        url={href}
                        height="auto"
                        width="100%"
                    />
                ));
            }

            // TikTok
            if (origin.includes("tiktok.com")) {
                return renderLinkAndEmbed(origin, href, children, (
                    <TikTokEmbed
                        url={href}
                        height="auto"
                        width="100%"
                    />
                ));
            }

            // X (Twitter)
            if (origin.includes("twitter.com") || origin.includes("x.com")) {
                return renderLinkAndEmbed(origin, href, children, (
                    <XEmbed
                        url={href}
                        height="auto"
                        width="100%"
                    />
                ));
            }

            // YouTube
            if (origin.includes("youtube.com") || origin.includes("youtu.be")) {
                return renderLinkAndEmbed(origin, href, children, (
                    <YouTubeEmbed
                        url={href}
                        height="auto"
                        width="100%"
                    />
                ));
            }

            // Telegram
            if (origin.includes("t.me")) {
                return renderLinkAndEmbed(origin, href, children, (
                    <TelegramEmbed src={href}
                        height="auto"
                        width="100%"
                    />
                ));
            }

            // Reddit
            if (origin.includes("reddit.com")) {
                return renderLinkAndEmbed(origin, href, children, (
                    <iframe src={href}
                        height="auto"
                        width="100%"
                        frameBorder="0"
                    ></iframe>
                ));
            }

            const titleText = linkTitles[href] && <span>{linkTitles[href]}</span>;
            return (
                <div className="link-view">
                    <a style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }} href={href} target="_blank" rel="noopener noreferrer">
                        <TryImg alt="Logo" style={{ width: "32px", height: "32px", objectFit: "contain", backgroundColor: "transparent" }} src={origin + "/favicon.ico"} />
                        {titleText}
                        <span>
                            {children}
                        </span>
                    </a>
                </div>
            );
        },
    };

    return <ReactMarkdown children={processedText} components={components} />;
}
