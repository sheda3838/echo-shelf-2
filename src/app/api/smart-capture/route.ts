import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { generateSmartCaptureMetadata } from "@/lib/ai/gemma";
import { findPotentialConnections } from "@/lib/services/potential-connections.service";
import { NormalizedExtraction } from "@/lib/extractors";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const extraction = body.extraction as NormalizedExtraction;

    if (!extraction || !extraction.text) {
      return NextResponse.json(
        { error: "Normalized extraction context is required to generate metadata." },
        { status: 400 }
      );
    }

    // Call Gemma AI for structured metadata generation
    const metadata = await generateSmartCaptureMetadata(extraction);

    // Refresh non-AI potential connection candidates with newly generated tags & title
    const potentialConnections = await findPotentialConnections(user.id, {
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      limit: 5,
    });

    return NextResponse.json({
      metadata,
      potentialConnections,
    });
  } catch (err: unknown) {
    console.error("Smart Capture error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate AI metadata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
