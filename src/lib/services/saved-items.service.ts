import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  SavedItem,
  ISavedItem,
  ContentType,
  ISource,
  IPreviewMetadata,
  IConnection,
} from "@/models/SavedItem";

export interface CreateSavedItemInput {
  title: string;
  description?: string;
  contentType: ContentType;
  source: ISource;
  metadata?: IPreviewMetadata;
  tags?: string[];
  connections?: IConnection[];
  canonicalUrl?: string;
  contentFingerprint?: string;
}

export interface UpdateSavedItemInput {
  title?: string;
  description?: string;
  contentType?: ContentType;
  source?: ISource;
  metadata?: IPreviewMetadata;
  tags?: string[];
  connections?: IConnection[];
  canonicalUrl?: string;
  contentFingerprint?: string;
  lastOpened?: Date;
}

export interface ListSavedItemsOptions {
  contentType?: ContentType;
  tag?: string;
  search?: string;
  limit?: number;
  skip?: number;
}

/**
 * Validates that an ID is a valid MongoDB ObjectId.
 */
function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && new Types.ObjectId(id).toString() === id;
}

/**
 * List saved items strictly isolated to the specified userId.
 */
export async function listSavedItems(
  userId: string,
  options: ListSavedItemsOptions = {}
): Promise<ISavedItem[]> {
  if (!userId) {
    throw new Error("userId is required for user isolation");
  }

  await connectToDatabase();

  const query: Record<string, unknown> = { userId };

  if (options.contentType) {
    query.contentType = options.contentType;
  }

  if (options.tag) {
    query.tags = options.tag;
  }

  if (options.search) {
    query.title = { $regex: options.search, $options: "i" };
  }

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const skip = Math.max(options.skip ?? 0, 0);

  return SavedItem.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean<ISavedItem[]>()
    .exec();
}

/**
 * Retrieve a single saved item strictly scoped to the userId.
 * Returns null if the item does not exist OR belongs to another user.
 */
export async function getSavedItemById(
  userId: string,
  itemId: string
): Promise<ISavedItem | null> {
  if (!userId || !itemId) {
    return null;
  }

  if (!isValidObjectId(itemId)) {
    return null;
  }

  await connectToDatabase();

  return SavedItem.findOne({
    _id: itemId,
    userId,
  })
    .lean<ISavedItem | null>()
    .exec();
}

/**
 * Create a new saved item.
 * The ownership userId is strictly injected from verified auth, ignoring any client data.
 */
export async function createSavedItem(
  userId: string,
  input: CreateSavedItemInput
): Promise<ISavedItem> {
  if (!userId) {
    throw new Error("userId is required for user isolation");
  }

  await connectToDatabase();

  const doc = new SavedItem({
    title: input.title,
    description: input.description,
    contentType: input.contentType,
    source: input.source,
    metadata: input.metadata ?? {},
    tags: input.tags ?? [],
    connections: input.connections ?? [],
    canonicalUrl: input.canonicalUrl,
    contentFingerprint: input.contentFingerprint,
    userId, // Enforced server-side
  });

  await doc.save();
  return doc.toObject() as ISavedItem;
}

/**
 * Update an existing saved item strictly scoped to userId.
 * Returns null if the item is not found or belongs to another user.
 */
export async function updateSavedItem(
  userId: string,
  itemId: string,
  input: UpdateSavedItemInput
): Promise<ISavedItem | null> {
  if (!userId || !itemId || !isValidObjectId(itemId)) {
    return null;
  }

  await connectToDatabase();

  // Explicitly avoid mass assignment of userId or _id
  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.contentType !== undefined) updateData.contentType = input.contentType;
  if (input.source !== undefined) updateData.source = input.source;
  if (input.metadata !== undefined) updateData.metadata = input.metadata;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.connections !== undefined) updateData.connections = input.connections;
  if (input.canonicalUrl !== undefined) updateData.canonicalUrl = input.canonicalUrl;
  if (input.contentFingerprint !== undefined) updateData.contentFingerprint = input.contentFingerprint;
  if (input.lastOpened !== undefined) updateData.lastOpened = input.lastOpened;

  return SavedItem.findOneAndUpdate(
    { _id: itemId, userId },
    { $set: updateData },
    { returnDocument: "after", runValidators: true }
  )
    .lean<ISavedItem | null>()
    .exec();
}

/**
 * Delete a saved item strictly scoped to userId.
 * Returns true if deleted, false if not found or unauthorized.
 */
export async function deleteSavedItem(
  userId: string,
  itemId: string
): Promise<boolean> {
  if (!userId || !itemId || !isValidObjectId(itemId)) {
    return false;
  }

  await connectToDatabase();

  const result = await SavedItem.findOneAndDelete({
    _id: itemId,
    userId,
  }).exec();

  return result !== null;
}

/**
 * Look up an item by canonical URL strictly within the user's library.
 */
export async function findSavedItemByCanonicalUrl(
  userId: string,
  canonicalUrl: string
): Promise<ISavedItem | null> {
  if (!userId || !canonicalUrl) {
    return null;
  }

  await connectToDatabase();

  return SavedItem.findOne({
    userId,
    canonicalUrl,
  })
    .lean<ISavedItem | null>()
    .exec();
}
