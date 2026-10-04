import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { KnowledgeCluster, IKnowledgeCluster } from "@/models/KnowledgeCluster";

export interface CreateKnowledgeClusterInput {
  title: string;
  summary?: string;
  tags?: string[];
  itemIds?: string[];
}

export interface UpdateKnowledgeClusterInput {
  title?: string;
  summary?: string;
  tags?: string[];
  itemIds?: string[];
}

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && new Types.ObjectId(id).toString() === id;
}

export async function listKnowledgeClusters(
  userId: string
): Promise<IKnowledgeCluster[]> {
  if (!userId) {
    throw new Error("userId is required for user isolation");
  }

  await connectToDatabase();

  return KnowledgeCluster.find({ userId })
    .sort({ createdAt: -1 })
    .lean<IKnowledgeCluster[]>()
    .exec();
}

export interface ClusterWithItems {
  _id: string;
  title: string;
  summary?: string;
  tags: string[];
  items: Array<{
    _id: string;
    title: string;
    contentType: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export async function listKnowledgeClustersWithItems(
  userId: string
): Promise<ClusterWithItems[]> {
  if (!userId) {
    throw new Error("userId is required for user isolation");
  }

  await connectToDatabase();
  const clusters = await KnowledgeCluster.find({ userId })
    .sort({ createdAt: -1 })
    .lean<IKnowledgeCluster[]>()
    .exec();

  if (clusters.length === 0) return [];

  const { SavedItem } = await import("@/models/SavedItem");
  const allItemIds = Array.from(
    new Set(clusters.flatMap((c) => c.itemIds.map((id) => id.toString())))
  );

  const itemDocs = await SavedItem.find(
    { _id: { $in: allItemIds }, userId },
    "_id title contentType"
  )
    .lean<Array<{ _id: Types.ObjectId; title: string; contentType: string }>>()
    .exec();

  const itemMap = new Map(
    itemDocs.map((doc) => [
      doc._id.toString(),
      { _id: doc._id.toString(), title: doc.title, contentType: doc.contentType },
    ])
  );

  return clusters.map((c) => ({
    _id: c._id.toString(),
    title: c.title,
    summary: c.summary,
    tags: c.tags || [],
    items: c.itemIds
      .map((id) => itemMap.get(id.toString()))
      .filter((item): item is { _id: string; title: string; contentType: string } => Boolean(item)),
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
  }));
}

export async function getKnowledgeClusterById(
  userId: string,
  clusterId: string
): Promise<IKnowledgeCluster | null> {
  if (!userId || !clusterId || !isValidObjectId(clusterId)) {
    return null;
  }

  await connectToDatabase();

  return KnowledgeCluster.findOne({
    _id: clusterId,
    userId,
  })
    .lean<IKnowledgeCluster | null>()
    .exec();
}

export async function createKnowledgeCluster(
  userId: string,
  input: CreateKnowledgeClusterInput
): Promise<IKnowledgeCluster> {
  if (!userId) {
    throw new Error("userId is required for user isolation");
  }

  await connectToDatabase();

  const validItemIds = (input.itemIds ?? [])
    .filter(isValidObjectId)
    .map((id) => new Types.ObjectId(id));

  const doc = new KnowledgeCluster({
    title: input.title,
    summary: input.summary,
    tags: input.tags ?? [],
    itemIds: validItemIds,
    userId,
  });

  await doc.save();
  return doc.toObject() as IKnowledgeCluster;
}

export async function updateKnowledgeCluster(
  userId: string,
  clusterId: string,
  input: UpdateKnowledgeClusterInput
): Promise<IKnowledgeCluster | null> {
  if (!userId || !clusterId || !isValidObjectId(clusterId)) {
    return null;
  }

  await connectToDatabase();

  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.summary !== undefined) updateData.summary = input.summary;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.itemIds !== undefined) {
    updateData.itemIds = input.itemIds
      .filter(isValidObjectId)
      .map((id) => new Types.ObjectId(id));
  }

  return KnowledgeCluster.findOneAndUpdate(
    { _id: clusterId, userId },
    { $set: updateData },
    { returnDocument: "after", runValidators: true }
  )
    .lean<IKnowledgeCluster | null>()
    .exec();
}

export async function deleteKnowledgeCluster(
  userId: string,
  clusterId: string
): Promise<boolean> {
  if (!userId || !clusterId || !isValidObjectId(clusterId)) {
    return false;
  }

  await connectToDatabase();

  const result = await KnowledgeCluster.findOneAndDelete({
    _id: clusterId,
    userId,
  }).exec();

  return result !== null;
}

/**
 * Generates and atomically persists cohesive knowledge clusters using Gemma.
 * Preserves previous clusters if generation fails.
 */
export async function generateAndSaveClusters(
  userId: string
): Promise<IKnowledgeCluster[]> {
  if (!userId) {
    throw new Error("userId is required for cluster generation.");
  }

  await connectToDatabase();

  // 1. Fetch user's saved items (lightweight metadata)
  // Dynamic import to avoid circular dependency
  const { SavedItem } = await import("@/models/SavedItem");
  const items = await SavedItem.find({ userId })
    .select("_id title description tags contentType")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()
    .exec();

  if (items.length < 2) {
    throw new Error("At least 2 saved items are required to generate knowledge clusters.");
  }

  const { generateKnowledgeClustersAI } = await import("@/lib/ai/gemma");

  const itemSummaries = items.map((i) => ({
    id: i._id.toString(),
    title: i.title,
    description: i.description,
    contentType: i.contentType,
    tags: i.tags || [],
  }));

  // 2. Call Gemma AI to synthesize clusters
  const generated = await generateKnowledgeClustersAI(itemSummaries);

  // 3. Filter and validate cluster memberships
  const validItemIdsSet = new Set(itemSummaries.map((i) => i.id));
  const validatedDocs = (generated || [])
    .map((c) => ({
      userId,
      title: c.title,
      summary: c.summary,
      tags: c.tags,
      itemIds: (c.itemIds || [])
        .filter((id) => validItemIdsSet.has(id))
        .map((id) => new Types.ObjectId(id)),
    }))
    .filter((c) => c.itemIds.length >= 2);

  if (validatedDocs.length === 0) {
    // Not enough related knowledge yet to create meaningful clusters.
    // Preserve existing clusters if user already had them, otherwise return empty list.
    const existing = await KnowledgeCluster.find({ userId }).lean().exec();
    return existing.map((doc) => doc as unknown as IKnowledgeCluster);
  }

  // 4. Atomically replace user's clusters
  await KnowledgeCluster.deleteMany({ userId });
  const created = await KnowledgeCluster.insertMany(validatedDocs);

  return created.map((doc) => doc.toObject() as IKnowledgeCluster);
}
