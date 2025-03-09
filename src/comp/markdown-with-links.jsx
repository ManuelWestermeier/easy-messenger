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
    // Replace newlines so that Markdown parses correctly
    text = text.replaceAll("\n", "\n\n");
    const [linkTitles, setLinkTitles] = useState({});

    // Process the text once so that plain URLs become Markdown links.
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

            // --- Social Media Embeds using react-social-media-embed ---

            // Facebook
            if (origin.includes("facebook.com") && !href.includes("messenger.com") && !href.includes("fb.me")) {
                return renderLinkAndEmbed(href, children, (
                    <FacebookEmbed url={href} width={550} />
                ));
            }

            // Instagram
            if (origin.includes("instagram.com") || origin.includes("instagr.am")) {
                return renderLinkAndEmbed(href, children, (
                    <InstagramEmbed
                        url={href}
                        width={400}
                        hideCaption={false}
                        containerTagName="div"
                        protocol=""
                        injectScript
                    />
                ));
            }

            // LinkedIn
            if (origin.includes("linkedin.com")) {
                // Using the same URL as both embed and postUrl (adjust if needed)
                return renderLinkAndEmbed(href, children, (
                    <LinkedInEmbed url={href} postUrl={href} width={325} height={570} />
                ));
            }

            // Pinterest
            if (origin.includes("pinterest.com")) {
                return renderLinkAndEmbed(href, children, (
                    <PinterestEmbed url={href} width={345} height={467} />
                ));
            }

            // TikTok
            if (origin.includes("tiktok.com")) {
                return renderLinkAndEmbed(href, children, (
                    <TikTokEmbed url={href} width={325} />
                ));
            }

            // X (Twitter) – also covers twitter.com and x.com
            if (origin.includes("twitter.com") || origin.includes("x.com")) {
                return renderLinkAndEmbed(href, children, (
                    <XEmbed url={href} width={325} />
                ));
            }

            // YouTube
            if (origin.includes("youtube.com") || origin.includes("youtu.be")) {
                return renderLinkAndEmbed(href, children, (
                    <YouTubeEmbed url={href} width={325} height={220} />
                ));
            }

            // --- Media Files: Images, Video, Audio ---

            if (href.match(/\.(jpeg|jpg|gif|png)$/i)) {
                const imgContent = <img src={href} alt={children} />;
                return renderLinkAndEmbed(href, children, imgContent);
            }
            if (href.match(/\.(mp4|webm|ogg)$/i)) {
                const videoContent = (
                    <video controls>
                        <source src={href} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                );
                return renderLinkAndEmbed(href, children, videoContent);
            }
            if (href.match(/\.(mp3|wav|ogg)$/i)) {
                const audioContent = (
                    <audio controls>
                        <source src={href} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                );
                return renderLinkAndEmbed(href, children, audioContent);
            }

            // --- Default: Render clickable link with fetched title (if available) ---
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
