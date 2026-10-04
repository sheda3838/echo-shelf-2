import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import {
  listRediscoveryResultsWithDetails,
  generateAndSaveRediscovery,
} from "@/lib/services/rediscovery.service";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Authentication required" },
      { status: 401 }
    );
  }

  try {
    const results = await listRediscoveryResultsWithDetails(user.id);
    return NextResponse.json({ results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load rediscovery results";
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
    await generateAndSaveRediscovery(user.id);
    const results = await listRediscoveryResultsWithDetails(user.id);
    return NextResponse.json({ results });
  } catch (err: unknown) {
    console.error("Contextual rediscovery error:", err);
    const message = err instanceof Error ? err.message : "Failed to run rediscovery";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
