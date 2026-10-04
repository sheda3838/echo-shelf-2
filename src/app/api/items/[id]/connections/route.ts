import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { generateAndSaveSmartConnections } from "@/lib/services/smart-connections.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Authentication required" },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  try {
    const result = await generateAndSaveSmartConnections(user.id, id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Smart Connections error:", err);
    const message = err instanceof Error ? err.message : "Failed to analyze smart connections";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
