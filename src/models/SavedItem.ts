import mongoose, { Schema, Document, Model, Types } from "mongoose";
import {
  CONTENT_TYPES,
  ContentType,
  SOURCE_TYPES,
  SourceType,
  ISource,
  IPreviewMetadata,
} from "@/types";

export { CONTENT_TYPES, SOURCE_TYPES };
export type { ContentType, SourceType, ISource, IPreviewMetadata };

export interface IConnection {
  connectedItemId: Types.ObjectId;
  strength?: number;
  relationshipType: string;
  explanation?: string;
}

export interface ISavedItem extends Document {
  _id: Types.ObjectId;
  userId: string;
  title: string;
  description?: string;
  contentType: ContentType;
  source: ISource;
  metadata?: IPreviewMetadata;
  tags: string[];
  connections: IConnection[];
  canonicalUrl?: string;
  contentFingerprint?: string;
  lastOpened?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectionSchema = new Schema<IConnection>(
  {
    connectedItemId: {
      type: Schema.Types.ObjectId,
      ref: "SavedItem",
      required: [true, "connectedItemId is required"],
    },
    strength: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
    },
    relationshipType: {
      type: String,
      required: [true, "relationshipType is required"],
      trim: true,
    },
    explanation: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const SourceSchema = new Schema<ISource>(
  {
    type: {
      type: String,
      enum: {
        values: SOURCE_TYPES,
        message: "{VALUE} is not a supported source type",
      },
      required: [true, "source type is required"],
    },
    url: {
      type: String,
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number,
      min: 0,
    },
    mimeType: {
      type: String,
      trim: true,
    },
    textSnippet: {
      type: String,
    },
  },
  { _id: false }
);

const MetadataSchema = new Schema<IPreviewMetadata>(
  {
    imageUrl: { type: String, trim: true },
    author: { type: String, trim: true },
    publishedAt: { type: String, trim: true },
    siteName: { type: String, trim: true },
    favicon: { type: String, trim: true },
  },
  { _id: false }
);

const SavedItemSchema = new Schema<ISavedItem>(
  {
    userId: {
      type: String,
      required: [true, "userId is required"],
      index: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    contentType: {
      type: String,
      enum: {
        values: CONTENT_TYPES,
        message: "{VALUE} is not a valid contentType",
      },
      default: "Other",
      required: [true, "contentType is required"],
    },
    source: {
      type: SourceSchema,
      required: [true, "source is required"],
    },
    metadata: {
      type: MetadataSchema,
      default: () => ({}),
    },
    tags: {
      type: [String],
      default: [],
    },
    connections: {
      type: [ConnectionSchema],
      default: [],
    },
    canonicalUrl: {
      type: String,
      trim: true,
    },
    contentFingerprint: {
      type: String,
      trim: true,
    },
    lastOpened: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user-isolated queries and duplicate detection
SavedItemSchema.index({ userId: 1, createdAt: -1 });
SavedItemSchema.index({ userId: 1, canonicalUrl: 1 }, { sparse: true });

export const SavedItem: Model<ISavedItem> =
  mongoose.models.SavedItem ||
  mongoose.model<ISavedItem>("SavedItem", SavedItemSchema);
