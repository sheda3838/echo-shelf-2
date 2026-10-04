import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  RediscoveryResult,
  IRediscoveryResult,
  IRediscoveryArticle,
} from "@/models/RediscoveryResult";

export interface CreateRediscoveryResultInput {
  article: IRediscoveryArticle;
  relevance?: number;
  relationshipType: string;
  explanation: string;
  savedItemId?: string;
  knowledgeClusterId?: string;
}

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && new Types.ObjectId(id).toString() === id;
}

export async function listRediscoveryResults(
  userId: string
): Promise<IRediscoveryResult[]> {
  if (!userId) {
    throw new Error("userId is required for user isolation");
  }

  await connectToDatabase();

  return RediscoveryResult.find({ userId })
    .sort({ createdAt: -1 })
    .lean<IRediscoveryResult[]>()
    .exec();
}

export interface RediscoveryResultWithDetails {
  _id: string;
  article: IRediscoveryArticle;
  relevance?: number;
  relationshipType: string;
  explanation: string;
  savedItemId?: string;
  savedItemTitle?: string;
  savedItemContentType?: string;
  knowledgeClusterId?: string;
  knowledgeClusterTitle?: string;
  discoveredAt: string;
  createdAt: string;
}

export async function listRediscoveryResultsWithDetails(
  userId: string
): Promise<RediscoveryResultWithDetails[]> {
  if (!userId) {
    throw new Error("userId is required for user isolation");
  }

  await connectToDatabase();

  const results = await RediscoveryResult.find({ userId })
    .sort({ createdAt: -1 })
    .lean<IRediscoveryResult[]>()
    .exec();

  if (results.length === 0) return [];

  const { SavedItem } = await import("@/models/SavedItem");
  const { KnowledgeCluster } = await import("@/models/KnowledgeCluster");

  const itemIds = Array.from(
    new Set(results.map((r) => r.savedItemId?.toString()).filter(Boolean) as string[])
  );
  const clusterIds = Array.from(
    new Set(results.map((r) => r.knowledgeClusterId?.toString()).filter(Boolean) as string[])
  );

  const [items, clusters] = await Promise.all([
    itemIds.length > 0
      ? SavedItem.find({ _id: { $in: itemIds }, userId }, "_id title contentType").lean().exec()
      : [],
    clusterIds.length > 0
      ? KnowledgeCluster.find({ _id: { $in: clusterIds }, userId }, "_id title").lean().exec()
      : [],
  ]);

  const itemMap = new Map(
    (items as Array<{ _id: Types.ObjectId; title: string; contentType: string }>).map((i) => [
      i._id.toString(),
      i,
    ])
  );
  const clusterMap = new Map(
    (clusters as Array<{ _id: Types.ObjectId; title: string }>).map((c) => [
      c._id.toString(),
      c,
    ])
  );

  return results.map((r) => {
    const sId = r.savedItemId?.toString();
    const cId = r.knowledgeClusterId?.toString();
    const item = sId ? itemMap.get(sId) : undefined;
    const cluster = cId ? clusterMap.get(cId) : undefined;

    return {
      _id: r._id.toString(),
      article: r.article,
      relevance: r.relevance,
      relationshipType: r.relationshipType,
      explanation: r.explanation,
      savedItemId: sId,
      savedItemTitle: item?.title,
      savedItemContentType: item?.contentType,
      knowledgeClusterId: cId,
      knowledgeClusterTitle: cluster?.title,
      discoveredAt: r.discoveredAt ? new Date(r.discoveredAt).toISOString() : new Date().toISOString(),
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    };
  });
}

export async function getRediscoveryResultById(
  userId: string,
  id: string
): Promise<IRediscoveryResult | null> {
  if (!userId || !id || !isValidObjectId(id)) {
    return null;
  }

  await connectToDatabase();

  return RediscoveryResult.findOne({
    _id: id,
    userId,
  })
    .lean<IRediscoveryResult | null>()
    .exec();
}

export async function createRediscoveryResult(
  userId: string,
  input: CreateRediscoveryResultInput
): Promise<IRediscoveryResult> {
  if (!userId) {
    throw new Error("userId is required for user isolation");
  }

  await connectToDatabase();

  const doc = new RediscoveryResult({
    userId,
    article: input.article,
    relevance: input.relevance ?? 0.5,
    relationshipType: input.relationshipType,
    explanation: input.explanation,
    savedItemId:
      input.savedItemId && isValidObjectId(input.savedItemId)
        ? new Types.ObjectId(input.savedItemId)
        : undefined,
    knowledgeClusterId:
      input.knowledgeClusterId && isValidObjectId(input.knowledgeClusterId)
        ? new Types.ObjectId(input.knowledgeClusterId)
        : undefined,
  });

  await doc.save();
  return doc.toObject() as IRediscoveryResult;
}

export async function deleteRediscoveryResult(
  userId: string,
  id: string
): Promise<boolean> {
  if (!userId || !id || !isValidObjectId(id)) {
    return false;
  }

  await connectToDatabase();

  const result = await RediscoveryResult.findOneAndDelete({
    _id: id,
    userId,
  }).exec();

  return result !== null;
}

/**
 * Fetches recent news from GNews based on user Knowledge Clusters,
 * analyzes relevance with Gemma, and atomically saves rediscovery results.
 * Preserves previous valid results if generation fails.
 */
export async function generateAndSaveRediscovery(
  userId: string
): Promise<IRediscoveryResult[]> {
  if (!userId) {
    throw new Error("userId is required for rediscovery.");
  }

  const gnewsApiKey = process.env.GNEWS_API_KEY;
  if (!gnewsApiKey) {
    throw new Error("GNEWS_API_KEY is not configured on the server.");
  }

  await connectToDatabase();

  // 1. Fetch user's knowledge clusters (up to 4)
  const { KnowledgeCluster } = await import("@/models/KnowledgeCluster");
  const clusters = await KnowledgeCluster.find({ userId })
    .sort({ createdAt: -1 })
    .limit(4)
    .lean()
    .exec();

  if (clusters.length === 0) {
    throw new Error("You need at least 1 Knowledge Cluster to run Contextual Rediscovery. Generate clusters first.");
  }

  // 2. Fetch user's saved items (lightweight metadata)
  const { SavedItem } = await import("@/models/SavedItem");
  const items = await SavedItem.find({ userId })
    .select("_id title description tags contentType")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()
    .exec();

  if (items.length === 0) {
    throw new Error("No saved items found to discover context for.");
  }

  // 3. Search GNews for each cluster topic (at most 4 queries)
  interface RawGNewsArticle {
    title: string;
    description: string;
    url: string;
    image?: string;
    publishedAt?: string;
    source?: { name?: string };
  }

  const allArticles: RawGNewsArticle[] = [];

  for (const cluster of clusters) {
    // Generate clean query terms: cluster title without punctuation
    const query = cluster.title
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join(" ");

    if (!query) continue;

    try {
      const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=5&apikey=${gnewsApiKey}`;
      const res = await fetch(gnewsUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.articles)) {
          allArticles.push(...data.articles);
        }
      }
    } catch (err) {
      console.error(`GNews query failed for cluster '${cluster.title}':`, err);
    }
  }

  if (allArticles.length === 0) {
    throw new Error("Could not retrieve current news articles from GNews. Previous results preserved.");
  }

  // 4. Normalize & deduplicate articles by URL and title
  const { canonicalizeUrl } = await import("./duplicate-detection.service");
  const uniqueArticlesMap = new Map<string, RawGNewsArticle>();

  for (const art of allArticles) {
    if (!art.url || !art.title) continue;
    const canonical = canonicalizeUrl(art.url);
    if (!uniqueArticlesMap.has(canonical)) {
      uniqueArticlesMap.set(canonical, art);
    }
  }

  const dedupedArticles = Array.from(uniqueArticlesMap.values()).slice(0, 15);

  // 5. Call Gemma to evaluate contextual relationships
  const { analyzeRediscoveryMatches } = await import("@/lib/ai/gemma");

  const formattedArticles = dedupedArticles.map((a) => ({
    url: a.url,
    title: a.title,
    description: a.description || "",
    source: a.source?.name || "News",
  }));

  const itemSummaries = items.map((i) => ({
    id: i._id.toString(),
    title: i.title,
    description: i.description,
    contentType: i.contentType,
    tags: i.tags || [],
  }));

  const clusterSummaries = clusters.map((c) => ({
    id: c._id.toString(),
    title: c.title,
    tags: c.tags || [],
  }));

  const matches = await analyzeRediscoveryMatches(
    formattedArticles,
    itemSummaries,
    clusterSummaries
  );

  // 6. Validate matches against real fetched articles and user items
  const validArticleMap = new Map(dedupedArticles.map((a) => [a.url, a]));
  const validItemIdSet = new Set(itemSummaries.map((i) => i.id));
  const validClusterIdSet = new Set(clusterSummaries.map((c) => c.id));
  const seenPairs = new Set<string>();

  const validatedDocs = [];

  for (const match of matches) {
    const rawArticle = validArticleMap.get(match.articleUrl);
    if (!rawArticle) continue;
    if (!validItemIdSet.has(match.savedItemId)) continue;
    if (match.knowledgeClusterId && !validClusterIdSet.has(match.knowledgeClusterId)) continue;

    const pairKey = `${match.articleUrl}::${match.savedItemId}`;
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    validatedDocs.push({
      userId,
      article: {
        title: rawArticle.title,
        url: rawArticle.url,
        source: rawArticle.source?.name || "News",
        publishedAt: rawArticle.publishedAt,
        snippet: (rawArticle.description || "").slice(0, 300),
      },
      relevance: match.relevance === "strong" ? 0.9 : 0.6,
      relationshipType: match.relationshipType,
      explanation: match.explanation,
      savedItemId: new Types.ObjectId(match.savedItemId),
      knowledgeClusterId: match.knowledgeClusterId
        ? new Types.ObjectId(match.knowledgeClusterId)
        : undefined,
      discoveredAt: new Date(),
    });
  }

  // 7. Atomically replace previous rediscovery results
  await RediscoveryResult.deleteMany({ userId });

  if (validatedDocs.length > 0) {
    const created = await RediscoveryResult.insertMany(validatedDocs);
    return created.map((doc) => doc.toObject() as IRediscoveryResult);
  }

  return [];
}
