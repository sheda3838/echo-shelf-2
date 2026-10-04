import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  supabaseUserId: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    supabaseUserId: {
      type: String,
      required: [true, "supabaseUserId is required"],
      unique: true,
      index: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model overwrite in development hot reloading
export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
