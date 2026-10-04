import { connectToDatabase } from "@/lib/db/mongodb";
import { User, IUser } from "@/models/User";

export async function getOrCreateUserProfile(
  supabaseUserId: string,
  profileData?: { displayName?: string; avatarUrl?: string }
): Promise<IUser> {
  if (!supabaseUserId) {
    throw new Error("supabaseUserId is required");
  }

  await connectToDatabase();

  let user = await User.findOne({ supabaseUserId }).exec();

  if (!user) {
    user = new User({
      supabaseUserId,
      displayName: profileData?.displayName,
      avatarUrl: profileData?.avatarUrl,
    });
    await user.save();
  } else if (
    (profileData?.displayName && user.displayName !== profileData.displayName) ||
    (profileData?.avatarUrl && user.avatarUrl !== profileData.avatarUrl)
  ) {
    if (profileData.displayName) user.displayName = profileData.displayName;
    if (profileData.avatarUrl) user.avatarUrl = profileData.avatarUrl;
    await user.save();
  }

  return user.toObject() as IUser;
}

export async function getUserProfile(
  supabaseUserId: string
): Promise<IUser | null> {
  if (!supabaseUserId) return null;

  await connectToDatabase();
  return User.findOne({ supabaseUserId }).lean<IUser | null>().exec();
}
