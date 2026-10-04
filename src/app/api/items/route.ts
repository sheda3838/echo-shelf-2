import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import {
  listSavedItems,
  createSavedItem,
  CreateSavedItemInput,
} from "@/lib/services/saved-items.service";
import { CONTENT_TYPES, ContentType } from "@/models/SavedItem";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Authentication required" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const contentType = searchParams.get("contentType") as ContentType | null;
  const tag = searchParams.get("tag") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const validContentType =
    contentType && CONTENT_TYPES.includes(contentType)
      ? contentType
      : undefined;

  try {
    const items = await listSavedItems(user.id, {
      contentType: validContentType,
      tag,
      search,
    });
    return NextResponse.json({ items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Validation error: 'title' is required" },
        { status: 400 }
      );
    }

    const contentType = body.contentType ?? "Other";
    if (!CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `Validation error: invalid contentType '${contentType}'` },
        { status: 400 }
      );
    }

    const source = body.source ?? {
      type: "text",
      textSnippet: body.title,
    };

    const input: CreateSavedItemInput = {
      title: body.title.trim(),
      description: body.description?.trim(),
      contentType,
      source,
      metadata: body.metadata,
      tags: Array.isArray(body.tags) ? body.tags : [],
      connections: Array.isArray(body.connections) ? body.connections : [],
      canonicalUrl: body.canonicalUrl?.trim(),
      contentFingerprint: body.contentFingerprint?.trim(),
    };

    // User ID is strictly derived from the verified Supabase token, never from body
    const item = await createSavedItem(user.id, input);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
