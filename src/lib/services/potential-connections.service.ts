import { connectToDatabase } from "@/lib/db/mongodb";
import { SavedItem, ISavedItem } from "@/models/SavedItem";

const COMMON_STOP_WORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "have", "more", "your",
  "what", "about", "which", "when", "there", "these", "some", "into", "then",
  "than", "will", "over", "just", "where", "most", "been", "through", "after",
]);

/**
 * Tokenizes text into normalized unique keywords (length >= 3, lowercase, no punctuation, stopwords excluded).
 */
export function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !COMMON_STOP_WORDS.has(w));
  return new Set(words);
}

export interface PotentialConnectionCandidate {
  id: string;
  title: string;
  contentType: string;
  description?: string;
  tags: string[];
  overlappingTags: string[];
  score: number;
}

/**
 * Finds potential candidate connections using deterministic tag and keyword matching.
 * NON-AI, zero-LLM candidate discovery.
 * Strict user isolation: compares ONLY against the authenticated user's other saved items.
 */
export async function findPotentialConnections(
  userId: string,
  params: {
    tags?: string[];
    title?: string;
    description?: string;
    excludeItemId?: string;
    limit?: number;
  }
): Promise<PotentialConnectionCandidate[]> {
  if (!userId) {
    throw new Error("userId is required for finding potential connections.");
  }

  await connectToDatabase();

  const query: Record<string, unknown> = { userId };
  if (params.excludeItemId) {
    query._id = { $ne: params.excludeItemId };
  }

  // Retrieve existing items for user (lightweight metadata projection)
  const existingItems = await SavedItem.find(query)
    .select("_id title contentType description tags")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean<ISavedItem[]>()
    .exec();

  if (existingItems.length === 0) return [];

  const inputTags = new Set(
    (params.tags || []).map((t) => t.toLowerCase().trim()).filter(Boolean)
  );

  const inputKeywords = extractKeywords(
    `${params.title || ""} ${params.description || ""}`
  );

  const candidates: PotentialConnectionCandidate[] = [];

  for (const item of existingItems) {
    const itemTags = (item.tags || []).map((t) => t.toLowerCase().trim());
    const overlappingTags: string[] = [];

    for (const t of itemTags) {
      if (inputTags.has(t)) {
        overlappingTags.push(t);
      }
    }

    let keywordOverlapCount = 0;
    if (inputKeywords.size > 0) {
      const itemKeywords = extractKeywords(`${item.title} ${item.description || ""}`);
      for (const k of itemKeywords) {
        if (inputKeywords.has(k)) {
          keywordOverlapCount++;
        }
      }
    }

    // Weight tag overlap heavily (3 pts each) + keyword overlap (1 pt each)
    const score = overlappingTags.length * 3 + keywordOverlapCount * 1;

    if (score > 0) {
      candidates.push({
        id: item._id.toString(),
        title: item.title,
        contentType: item.contentType,
        description: item.description,
        tags: item.tags || [],
        overlappingTags,
        score,
      });
    }
  }

  // Sort descending by score and limit to top candidates
  candidates.sort((a, b) => b.score - a.score);
  const maxLimit = params.limit ? Math.min(params.limit, 10) : 5;

  return candidates.slice(0, maxLimit);
}
