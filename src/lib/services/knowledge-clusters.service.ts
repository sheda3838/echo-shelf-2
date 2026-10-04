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
