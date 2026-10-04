import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { listRediscoveryResultsWithDetails } from "@/lib/services/rediscovery.service";
import { listKnowledgeClusters } from "@/lib/services/knowledge-clusters.service";
import { RediscoverClient } from "./RediscoverClient";

export const metadata = {
  title: "Contextual Rediscovery - Echo Shelf",
  description: "Connect current live events to your personal knowledge vault",
};

export default async function RediscoverPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?redirectTo=/rediscover");
  }

  // Pure DB reads: zero external API calls on page load
  const [results, clusters] = await Promise.all([
    listRediscoveryResultsWithDetails(user.id),
    listKnowledgeClusters(user.id),
  ]);

  return (
    <RediscoverClient
      initialResults={results}
      clusterCount={clusters.length}
      userEmail={user.email}
    />
  );
}
