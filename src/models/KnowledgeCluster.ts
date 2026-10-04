import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IKnowledgeCluster extends Document {
  _id: Types.ObjectId;
  userId: string;
  title: string;
  summary?: string;
  tags: string[];
  itemIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeClusterSchema = new Schema<IKnowledgeCluster>(
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
    summary: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    itemIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "SavedItem",
      },
    ],
  },
  {
    timestamps: true,
  }
);

KnowledgeClusterSchema.index({ userId: 1, createdAt: -1 });

export const KnowledgeCluster: Model<IKnowledgeCluster> =
  mongoose.models.KnowledgeCluster ||
  mongoose.model<IKnowledgeCluster>("KnowledgeCluster", KnowledgeClusterSchema);
