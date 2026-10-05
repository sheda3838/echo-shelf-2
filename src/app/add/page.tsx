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
    <div className="min-h-screen bg-[#040D0A] text-[#F0FDF4] flex flex-col">
      <Navigation userEmail={user.email} userId={user.id} />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        <AddClient />
      </main>
    </div>
  );
}
