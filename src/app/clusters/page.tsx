import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { listKnowledgeClustersWithItems } from "@/lib/services/knowledge-clusters.service";
import { listSavedItems } from "@/lib/services/saved-items.service";
import { ClustersClient } from "./ClustersClient";

export const metadata = {
  title: "Knowledge Clusters - Echo Shelf",
  description: "Thematic conceptual grouping of your knowledge assets",
};

export default async function ClustersPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?redirectTo=/clusters");
  }

  // Pure DB reads: zero AI calls on page load
  const [clusters, items] = await Promise.all([
    listKnowledgeClustersWithItems(user.id),
    listSavedItems(user.id),
  ]);

  return (
    <ClustersClient
      initialClusters={clusters}
      totalSavedItems={items.length}
      userEmail={user.email}
    />
  );
}
