import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { NormalizedExtraction } from "./types";
import { ContentType } from "@/types";

const MAX_TEXT_LENGTH = 15000;
const FETCH_TIMEOUT_MS = 10000;

/**
 * Checks if a hostname or IP is an internal/private address to prevent SSRF attacks.
 */
export function isPrivateOrInternalHost(host: string): boolean {
  const normalizedHost = host.toLowerCase().trim();

  // Strip enclosing brackets for IPv6
  const cleanHost = normalizedHost.replace(/^\[|\]$/g, "");

  if (
    cleanHost === "localhost" ||
    cleanHost === "127.0.0.1" ||
    cleanHost === "0.0.0.0" ||
    cleanHost === "::1" ||
    cleanHost === "0:0:0:0:0:0:0:0" ||
    cleanHost.endsWith(".localhost") ||
    cleanHost.endsWith(".local") ||
    cleanHost.endsWith(".internal")
  ) {
    return true;
  }

  // IPv4 Private Ranges
  // 10.0.0.0/8
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) return true;
  // 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
  const match172 = cleanHost.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (match172) {
    const secondOctet = parseInt(match172[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  // 192.168.0.0/16
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) return true;
  // 169.254.0.0/16 (Link Local / Cloud metadata endpoints like AWS 169.254.169.254)
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) return true;

  // IPv6 Unique Local Address (fc00::/7) or Link-Local (fe80::/10)
  if (cleanHost.startsWith("fc") || cleanHost.startsWith("fd") || cleanHost.startsWith("fe80")) {
    return true;
  }

  return false;
}

/**
 * Validates and canonicalizes a web URL.
 */
export function validateAndNormalizeUrl(rawUrl: string): URL {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl.trim());
  } catch {
    throw new Error("Invalid URL format. Please provide a valid HTTP or HTTPS URL.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${parsedUrl.protocol}. Only http and https are allowed.`);
  }

  if (isPrivateOrInternalHost(parsedUrl.hostname)) {
    throw new Error("Access to private, localhost, or internal network addresses is blocked for security.");
  }

  return parsedUrl;
}

/**
 * Extracts readable article/webpage content from an external URL.
 */
export async function extractArticleOrUrl(
  rawUrl: string,
  contentType: ContentType = "Article"
): Promise<NormalizedExtraction> {
  const url = validateAndNormalizeUrl(rawUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (compatible; EchoShelfBot/2.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000}s while fetching webpage.`);
    }
    throw new Error(`Failed to fetch webpage: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("The requested webpage was not found (404).");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Access to this webpage is restricted or requires authentication (HTTP ${response.status}).`);
    }
    throw new Error(`Webpage returned an error status: HTTP ${response.status} ${response.statusText}`);
  }

  const contentTypeHeader = response.headers.get("content-type") || "";
  if (!contentTypeHeader.includes("text/html") && !contentTypeHeader.includes("application/xhtml")) {
    throw new Error(`Non-HTML content encountered: ${contentTypeHeader || "unknown"}. Please use document or file upload.`);
  }

  const html = await response.text();
  if (!html.trim()) {
    throw new Error("Webpage returned empty content.");
  }

  // Parse DOM with JSDOM
  const dom = new JSDOM(html, { url: url.toString() });
  const doc = dom.window.document;

  // Extract meta tags for fallback hints
  const getMeta = (nameOrProp: string) => {
    const el =
      doc.querySelector(`meta[name="${nameOrProp}"]`) ||
      doc.querySelector(`meta[property="${nameOrProp}"]`);
    return el?.getAttribute("content")?.trim() || undefined;
  };

  const metaTitle = getMeta("og:title") || getMeta("twitter:title") || doc.title?.trim();
  const metaDescription =
    getMeta("description") || getMeta("og:description") || getMeta("twitter:description");
  const metaImage = getMeta("og:image") || getMeta("twitter:image");
  const siteName = getMeta("og:site_name") || url.hostname;
  const author = getMeta("author") || getMeta("article:author");

  // Readability extraction
  const reader = new Readability(doc);
  const article = reader.parse();

  let extractedText = "";
  let finalTitle = metaTitle;

  if (article && article.textContent && article.textContent.trim().length > 100) {
    extractedText = article.textContent.replace(/\s+/g, " ").trim();
    if (article.title) {
      finalTitle = article.title.trim();
    }
  } else {
    // Fallback: extract body text if Readability couldn't isolate an article
    const bodyText = doc.body?.textContent?.replace(/\s+/g, " ").trim() || "";
    if (bodyText.length > 50) {
      extractedText = bodyText;
    } else if (metaDescription) {
      extractedText = metaDescription;
    } else {
      throw new Error(
        "Could not extract readable text from this webpage (it may be heavily JavaScript-rendered or empty). Please paste content as a Note."
      );
    }
  }

  // Cap extracted text to avoid prompt overflow
  if (extractedText.length > MAX_TEXT_LENGTH) {
    extractedText = extractedText.slice(0, MAX_TEXT_LENGTH) + "... [truncated]";
  }

  // Normalize image URL if relative
  let resolvedImageUrl: string | undefined = metaImage;
  if (resolvedImageUrl && !resolvedImageUrl.startsWith("http")) {
    try {
      resolvedImageUrl = new URL(resolvedImageUrl, url.origin).toString();
    } catch {
      resolvedImageUrl = undefined;
    }
  }

  return {
    contentType,
    titleHint: finalTitle || url.hostname,
    text: extractedText,
    descriptionHint: metaDescription,
    previewImageUrl: resolvedImageUrl,
    canonicalUrl: url.toString(),
    authorHint: author,
    siteNameHint: siteName,
    sourceMetadata: {
      url: url.toString(),
      hostname: url.hostname,
      byline: article?.byline || author,
      siteName,
    },
  };
}
