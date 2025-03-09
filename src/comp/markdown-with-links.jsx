import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import axios from "axios";

// Custom image component that falls back to an alternative if the image fails to load.
function TryImg({ src, alt, alternative, style, ...data }) {
    const [render, setRender] = useState(true);

    if (!render && alternative) {
        return alternative;
    }

    return (
        <img
            {...data}
            src={src}
            style={{
                ...style,
                display: render ? style?.display || "block" : "none"
            }}
            alt={alt}
            onError={(e) => {
                e.preventDefault();
                setRender(false);
            }}
        />
    );
}

// Social media embed components
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

// Helper function to fetch the title of a webpage.
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

// Preprocess text: wrap plain URLs in angle brackets so that ReactMarkdown detects them as links.
const preprocessText = (text) => {
    return text.replace(/(^|\s)(https?:\/\/[^\s]+)/g, "$1<$2>");
};

// Component to render links with an optional embedded view.
// It uses a local "see/hide" toggle to display the embed.
const LinkEmbed = ({ origin, href, children, embedContent, linkTitles }) => {
    const [see, setSee] = useState(false);
    return (
        <div className="link-view">
            <div>
                <a
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "5px"
                    }}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <TryImg
                        alt="Logo"
                        style={{
                            width: "32px",
                            height: "32px",
                            objectFit: "contain",
                            backgroundColor: "transparent"
                        }}
                        src={origin + "/favicon.ico"}
                    />
                    {linkTitles[href] && <span>{linkTitles[href]}</span>}
                    <span>{children}</span>
                </a>
                <button
                    style={{ marginBottom: see ? "5px" : "" }}
                    onClick={() => setSee((prev) => !prev)}
                >
                    {!see ? "See" : "Hide"}
                </button>
            </div>
            {embedContent && see && <div>{embedContent}</div>}
        </div>
    );
};

export default function MarkdownWithLinks({ text = "" }) {
    // Replace single line breaks with double line breaks for proper markdown parsing.
    const processedText = preprocessText(text.replaceAll("\n", "\n\n"));
    const [linkTitles, setLinkTitles] = useState({});

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

    const components = {
        // Custom link renderer to detect social media URLs and embed their content.
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
            if (
                origin.includes("facebook.com") &&
                !href.includes("messenger.com") &&
                !href.includes("fb.me")
            ) {
                return (
                    <LinkEmbed
                        origin={origin}
                        href={href}
                        linkTitles={linkTitles}
                        embedContent={<FacebookEmbed url={href} width="100%" height="auto" />}
                    >
                        {children}
                    </LinkEmbed>
                );
            }

            // Instagram
            if (origin.includes("instagram.com") || origin.includes("instagr.am")) {
                return (
                    <LinkEmbed
                        origin={origin}
                        href={href}
                        linkTitles={linkTitles}
                        embedContent={
                            <InstagramEmbed
                                url={href}
                                height="auto"
                                width="100%"
                                hideCaption={false}
                                containerTagName="div"
                                protocol=""
                                injectScript
                            />
                        }
                    >
                        {children}
                    </LinkEmbed>
                );
            }

            // LinkedIn
            if (origin.includes("linkedin.com")) {
                return (
                    <LinkEmbed
                        origin={origin}
                        href={href}
                        linkTitles={linkTitles}
                        embedContent={
                            <LinkedInEmbed url={href} postUrl={href} height="auto" width="100%" />
                        }
                    >
                        {children}
                    </LinkEmbed>
                );
            }

            // Pinterest
            if (origin.includes("pinterest.com")) {
                return (
                    <LinkEmbed
                        origin={origin}
                        href={href}
                        linkTitles={linkTitles}
                        embedContent={<PinterestEmbed url={href} height="auto" width="100%" />}
                    >
                        {children}
                    </LinkEmbed>
                );
            }

            // TikTok
            if (origin.includes("tiktok.com")) {
                return (
                    <LinkEmbed
                        origin={origin}
                        href={href}
                        linkTitles={linkTitles}
                        embedContent={<TikTokEmbed url={href} height="auto" width="100%" />}
                    >
                        {children}
                    </LinkEmbed>
                );
            }

            // X (Twitter)
            if (origin.includes("twitter.com") || origin.includes("x.com")) {
                return (
                    <LinkEmbed
                        origin={origin}
                        href={href}
                        linkTitles={linkTitles}
                        embedContent={<XEmbed url={href} height="auto" width="100%" />}
                    >
                        {children}
                    </LinkEmbed>
                );
            }

            // YouTube
            if (origin.includes("youtube.com") || origin.includes("youtu.be")) {
                return (
                    <LinkEmbed
                        origin={origin}
                        href={href}
                        linkTitles={linkTitles}
                        embedContent={<YouTubeEmbed url={href} height="auto" width="100%" />}
                    >
                        {children}
                    </LinkEmbed>
                );
            }

            // Telegram
            if (origin.includes("t.me")) {
                return (
                    <LinkEmbed
                        origin={origin}
                        href={href}
                        linkTitles={linkTitles}
                        embedContent={<TelegramEmbed src={href} height="auto" width="100%" />}
                    >
                        {children}
                    </LinkEmbed>
                );
            }

            // // Reddit
            // if (origin.includes("reddit.com")) {
            //     return <div className="link-view">
            //         <a
            //             style={{
            //                 display: "flex",
            //                 alignItems: "center",
            //                 justifyContent: "center",
            //                 gap: "5px"
            //             }}
            //             href={href}
            //             target="_blank"
            //             rel="noopener noreferrer"
            //         >
            //             <TryImg
            //                 alt="Logo"
            //                 style={{
            //                     width: "32px",
            //                     height: "32px",
            //                     objectFit: "contain",
            //                     backgroundColor: "transparent"
            //                 }}
            //                 src={origin + "/favicon.ico"}
            //             />
            //             {linkTitles[href] && <span>{linkTitles[href]}</span>}
            //             <span>{children}</span>
            //         </a>
            //     </div>
            // }

            // Default: just render a regular link with the favicon and title if available.
            return (
                <div className="link-view">
                    <a
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px"
                        }}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <TryImg
                            alt="Logo"
                            style={{
                                width: "32px",
                                height: "32px",
                                objectFit: "contain",
                                backgroundColor: "transparent"
                            }}
                            src={origin + "/favicon.ico"}
                        />
                        {linkTitles[href] && <span>{linkTitles[href]}</span>}
                        <span>{children}</span>
                    </a>
                </div>
            );
        },
        // Custom renderers for media elements.
        img: ({ node, ...props }) => <TryImg {...props} />,
        video: ({ node, ...props }) => <video controls {...props} />,
        audio: ({ node, ...props }) => <audio controls {...props} />
    };

    return <ReactMarkdown children={processedText} components={components} />;
}
