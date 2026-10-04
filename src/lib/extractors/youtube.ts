import { NormalizedExtraction } from "./types";

/**
 * Parses and extracts a YouTube 11-character video ID from multiple URL variations.
 */
export function extractYouTubeVideoId(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("Invalid YouTube URL format.");
  }

  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  // youtu.be/<id>
  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = path.replace(/^\//, "").split("/")[0].split("?")[0];
    if (isValidVideoId(id)) return id;
  }

  // youtube.com / m.youtube.com
  if (host.includes("youtube.com")) {
    // /watch?v=<id>
    const vParam = url.searchParams.get("v");
    if (vParam && isValidVideoId(vParam)) {
      return vParam;
    }

    // /shorts/<id>
    const shortsMatch = path.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) {
      return shortsMatch[1];
    }

    // /embed/<id>
    const embedMatch = path.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) {
      return embedMatch[1];
    }

    // /v/<id>
    const vPathMatch = path.match(/\/v\/([a-zA-Z0-9_-]{11})/);
    if (vPathMatch) {
      return vPathMatch[1];
    }
  }

  throw new Error("Could not extract a valid YouTube video ID from the provided URL.");
}

function isValidVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

/**
 * Extracts structured metadata for a YouTube video via YouTube Data API v3.
 */
export async function extractYouTubeVideo(rawUrl: string): Promise<NormalizedExtraction> {
  const videoId = extractYouTubeVideoId(rawUrl);
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YouTube API key is not configured on the server (YOUTUBE_API_KEY).");
  }

  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(apiUrl);
  } catch (err: unknown) {
    throw new Error(`Failed to contact YouTube API: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("YouTube API request rejected or daily quota exceeded.");
    }
    throw new Error(`YouTube API returned an error status: HTTP ${res.status}`);
  }

  const data = await res.json();

  if (!data.items || data.items.length === 0) {
    throw new Error("YouTube video not found. It may be private, unlisted, or deleted.");
  }

  const snippet = data.items[0].snippet || {};
  const contentDetails = data.items[0].contentDetails || {};

  const title = snippet.title || "YouTube Video";
  const channelTitle = snippet.channelTitle || "Unknown Channel";
  const description = (snippet.description || "").slice(0, 5000);
  const publishedAt = snippet.publishedAt || "";
  const duration = contentDetails.duration || "";
  const tags: string[] = Array.isArray(snippet.tags) ? snippet.tags : [];

  // Pick best available thumbnail
  const thumbs = snippet.thumbnails || {};
  const previewImageUrl =
    thumbs.maxres?.url ||
    thumbs.standard?.url ||
    thumbs.high?.url ||
    thumbs.medium?.url ||
    thumbs.default?.url;

  const normalizedContext = [
    `Video Title: ${title}`,
    `Channel: ${channelTitle}`,
    publishedAt ? `Published Date: ${publishedAt}` : "",
    duration ? `Duration: ${duration}` : "",
    tags.length > 0 ? `Video Tags: ${tags.slice(0, 10).join(", ")}` : "",
    description ? `\nDescription:\n${description}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return {
    contentType: "Video",
    titleHint: title,
    descriptionHint: description.slice(0, 300),
    text: normalizedContext,
    previewImageUrl,
    canonicalUrl,
    authorHint: channelTitle,
    siteNameHint: "YouTube",
    sourceMetadata: {
      videoId,
      channelTitle,
      channelId: snippet.channelId,
      publishedAt,
      duration,
      tags,
    },
  };
}
