import crypto from "crypto";
import { connectToDatabase } from "@/lib/db/mongodb";
import { SavedItem, ISavedItem } from "@/models/SavedItem";

const TRACKING_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "ref",
  "source",
  "feature",
  "si",
  "spm",
  "mc_cid",
  "mc_eid",
]);

/**
 * Strips tracking parameters, normalizes hostname, path, and protocol.
 */
export function canonicalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());

    // Normalize protocol and hostname
    url.protocol = "https:"; // Treat http and https as equivalent canonical destination where applicable
    let hostname = url.hostname.toLowerCase();
    if (hostname.startsWith("www.")) {
      hostname = hostname.slice(4);
    }
    url.hostname = hostname;

    // Filter out tracking query parameters
    const searchParams = new URLSearchParams(url.search);
    const keysToRemove: string[] = [];

    searchParams.forEach((_, key) => {
      const lowerKey = key.toLowerCase();
      if (
        TRACKING_QUERY_PARAMS.has(lowerKey) ||
        lowerKey.startsWith("utm_") ||
        lowerKey.startsWith("ga_")
      ) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach((key) => searchParams.delete(key));

    // Sort remaining params deterministically
    searchParams.sort();
    url.search = searchParams.toString();

    // Strip trailing slash from path (unless it is root "/")
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    url.pathname = pathname;

    // Remove hash/fragment
    url.hash = "";

    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}

/**
 * Computes a SHA-256 fingerprint for arbitrary content strings or buffers.
 */
export function computeContentFingerprint(content: string | Buffer): string {
  const normalized = typeof content === "string" ? content.trim() : content;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType?: "canonicalUrl" | "contentFingerprint" | "url" | "fingerprint";
  existingItem?: {
    id: string;
    title: string;
    contentType: string;
    createdAt: Date;
    canonicalUrl?: string;
  };
}

export interface DuplicateCheckParams {
  rawUrl?: string;
  url?: string;
  canonicalUrl?: string;
  content?: string | Buffer;
  textContent?: string;
  contentFingerprint?: string;
}

/**
 * Checks if a duplicate item exists strictly within the authenticated user's library.
 * Isolation guarantee: NEVER compares against or exposes another user's items.
 */
export async function checkDuplicate(
  userId: string,
  params: DuplicateCheckParams
): Promise<DuplicateCheckResult> {
  if (!userId) {
    throw new Error("userId is required for duplicate checking.");
  }

  await connectToDatabase();

  const urlInput = params.url || params.rawUrl;

  // 1. Check by canonical URL
  const targetCanonicalUrl =
    params.canonicalUrl || (urlInput ? canonicalizeUrl(urlInput) : undefined);

  if (targetCanonicalUrl) {
    const existingByUrl = await SavedItem.findOne({
      userId,
      $or: [
        { canonicalUrl: targetCanonicalUrl },
        ...(urlInput ? [{ "source.url": urlInput }] : []),
      ],
    })
      .lean<ISavedItem | null>()
      .exec();

    if (existingByUrl) {
      return {
        isDuplicate: true,
        matchType: "url",
        existingItem: {
          id: existingByUrl._id.toString(),
          title: existingByUrl.title,
          contentType: existingByUrl.contentType,
          createdAt: existingByUrl.createdAt,
          canonicalUrl: existingByUrl.canonicalUrl,
        },
      };
    }
  }

  // 2. Check by content fingerprint
  const contentInput = params.textContent || params.content;
  const targetFingerprint =
    params.contentFingerprint ||
    (contentInput ? computeContentFingerprint(contentInput) : undefined);

  if (targetFingerprint) {
    const existingByFingerprint = await SavedItem.findOne({
      userId,
      contentFingerprint: targetFingerprint,
    })
      .lean<ISavedItem | null>()
      .exec();

    if (existingByFingerprint) {
      return {
        isDuplicate: true,
        matchType: "fingerprint",
        existingItem: {
          id: existingByFingerprint._id.toString(),
          title: existingByFingerprint.title,
          contentType: existingByFingerprint.contentType,
          createdAt: existingByFingerprint.createdAt,
        },
      };
    }
  }

  return { isDuplicate: false };
}

export const checkForDuplicate = checkDuplicate;
