import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { listSavedItems } from "@/lib/services/saved-items.service";
import { getOrCreateUserProfile } from "@/lib/services/user-profile.service";
import { Navigation } from "@/components/Navigation";
import { LibraryClient } from "./LibraryClient";

export const metadata = {
  title: "Library - Echo Shelf",
  description: "Your secure personal knowledge vault",
};

export default async function LibraryPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login?redirectTo=/library");
  }

  // Sync / get MongoDB profile for verified Supabase identity
  try {
    await getOrCreateUserProfile(user.id, {
      displayName: user.user_metadata?.full_name || user.email?.split("@")[0],
      avatarUrl: user.user_metadata?.avatar_url,
    });
  } catch (err) {
    console.error("Profile sync error:", err);
  }

  // Load initial items on the server with strict user scoping
  let initialItems = [];
  try {
    const rawItems = await listSavedItems(user.id);
    initialItems = JSON.parse(JSON.stringify(rawItems));
  } catch (err) {
    console.error("Failed to load initial items:", err);
  }

  return (
    <div className="min-h-screen bg-[#040D0A] text-[#F0FDF4] flex flex-col">
      <Navigation userEmail={user.email} userId={user.id} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LibraryClient initialItems={initialItems} />
      </main>
    </div>
  );
}
