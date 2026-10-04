import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { Navigation } from "@/components/Navigation";
import { AddClient } from "./AddClient";

export const metadata = {
  title: "Add Knowledge Asset - Echo Shelf",
  description: "Capture and intelligently enrich knowledge assets",
};

export default async function AddPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?redirectTo=/add");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <Navigation userEmail={user.email} userId={user.id} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <AddClient />
      </main>
    </div>
  );
}
