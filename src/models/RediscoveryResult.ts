import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IRediscoveryArticle {
  title: string;
  url: string;
  source?: string;
  publishedAt?: string;
  snippet?: string;
}

export interface IRediscoveryResult extends Document {
  _id: Types.ObjectId;
  userId: string;
  article: IRediscoveryArticle;
  relevance?: number;
  relationshipType: string;
  explanation: string;
  savedItemId?: Types.ObjectId;
  knowledgeClusterId?: Types.ObjectId;
  discoveredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RediscoveryArticleSchema = new Schema<IRediscoveryArticle>(
  {
    title: { type: String, required: [true, "article title is required"], trim: true },
    url: { type: String, required: [true, "article url is required"], trim: true },
    source: { type: String, trim: true },
    publishedAt: { type: String, trim: true },
    snippet: { type: String, trim: true },
  },
  { _id: false }
);

const RediscoveryResultSchema = new Schema<IRediscoveryResult>(
  {
    userId: {
      type: String,
      required: [true, "userId is required"],
      index: true,
      trim: true,
    },
    article: {
      type: RediscoveryArticleSchema,
      required: [true, "article is required"],
    },
    relevance: {
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
      required: [true, "explanation is required"],
      trim: true,
    },
    savedItemId: {
      type: Schema.Types.ObjectId,
      ref: "SavedItem",
    },
    knowledgeClusterId: {
      type: Schema.Types.ObjectId,
      ref: "KnowledgeCluster",
    },
    discoveredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

RediscoveryResultSchema.index({ userId: 1, createdAt: -1 });

export const RediscoveryResult: Model<IRediscoveryResult> =
  mongoose.models.RediscoveryResult ||
  mongoose.model<IRediscoveryResult>("RediscoveryResult", RediscoveryResultSchema);
