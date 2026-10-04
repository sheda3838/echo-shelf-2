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
