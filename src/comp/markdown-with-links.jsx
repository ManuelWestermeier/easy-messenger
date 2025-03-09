import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import axios from "axios";

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
                return renderLinkAndEmbed(href, children, (
                    <FacebookEmbed url={href} width={"100%"} />
                ));
            }

            // Instagram
            if (origin.includes("instagram.com") || origin.includes("instagr.am")) {
                return renderLinkAndEmbed(href, children, (
                    <InstagramEmbed
                        url={href}
                        width={"100%"}
                        hideCaption={false}
                        containerTagName="div"
                        protocol=""
                        injectScript
                    />
                ));
            }

            // LinkedIn
            if (origin.includes("linkedin.com")) {
                return renderLinkAndEmbed(href, children, (
                    <LinkedInEmbed url={href} postUrl={href} width={"100%"} height={570} />
                ));
            }

            // Pinterest
            if (origin.includes("pinterest.com")) {
                return renderLinkAndEmbed(href, children, (
                    <PinterestEmbed url={href} width={"100%"} height={467} />
                ));
            }

            // TikTok
            if (origin.includes("tiktok.com")) {
                return renderLinkAndEmbed(href, children, (
                    <TikTokEmbed url={href} width={"100%"} />
                ));
            }

            // X (Twitter)
            if (origin.includes("twitter.com") || origin.includes("x.com")) {
                return renderLinkAndEmbed(href, children, (
                    <XEmbed url={href} width={"100%"} />
                ));
            }

            // YouTube
            if (origin.includes("youtube.com") || origin.includes("youtu.be")) {
                return renderLinkAndEmbed(href, children, (
                    <YouTubeEmbed url={href} width={"100%"} height={220} />
                ));
            }

            // Telegram
            if (origin.includes("t.me")) {
                return renderLinkAndEmbed(href, children, (
                    <TelegramEmbed src={href} width={"100%"} />
                ));
            }

            // Reddit
            if (origin.includes("reddit.com")) {
                return renderLinkAndEmbed(href, children, (
                    <iframe src={href} width="100%" height="400" frameBorder="0" scrolling="no"></iframe>
                ));
            }

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
