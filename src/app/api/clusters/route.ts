import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import {
  listKnowledgeClustersWithItems,
  generateAndSaveClusters,
} from "@/lib/services/knowledge-clusters.service";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Authentication required" },
      { status: 401 }
    );
  }

  try {
    const clusters = await listKnowledgeClustersWithItems(user.id);
    return NextResponse.json({ clusters });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load clusters";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Authentication required" },
      { status: 401 }
    );
  }

  try {
    await generateAndSaveClusters(user.id);
    const clusters = await listKnowledgeClustersWithItems(user.id);
    const message =
      clusters.length === 0
        ? "Not enough related knowledge yet to create meaningful clusters. Save a few related items and try again."
        : undefined;
    return NextResponse.json({ clusters, message });
  } catch (err: unknown) {
    console.error("Cluster generation error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate clusters";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
