import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { listSavedItems } from "@/lib/services/saved-items.service";
import { getOrCreateUserProfile } from "@/lib/services/user-profile.service";
import { signout } from "@/app/auth/actions";
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      {/* Navigation Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg tracking-tight">Echo Shelf 2.0</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              Phase 1: Secure Foundation
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">
                {user.email}
              </p>
              <p className="text-[10px] font-mono text-zinc-400 truncate max-w-[200px]">
                UID: {user.id.slice(0, 8)}...
              </p>
            </div>

            <form action={signout}>
              <button
                type="submit"
                className="py-1.5 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <LibraryClient initialItems={initialItems} />
      </main>
    </div>
  );
}
