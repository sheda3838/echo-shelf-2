import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import {
  getSavedItemById,
  updateSavedItem,
  deleteSavedItem,
  UpdateSavedItemInput,
} from "@/lib/services/saved-items.service";
import { CONTENT_TYPES } from "@/models/SavedItem";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Authentication required" },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const item = await getSavedItemById(user.id, id);

  if (!item) {
    // Return 404 without leaking whether the item exists for another user
    return NextResponse.json(
      { error: "Item not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ item });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Authentication required" },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  try {
    const body = await request.json();

    if (body.contentType && !CONTENT_TYPES.includes(body.contentType)) {
      return NextResponse.json(
        { error: `Validation error: invalid contentType '${body.contentType}'` },
        { status: 400 }
      );
    }

    const input: UpdateSavedItemInput = {};
    if (body.title !== undefined) input.title = body.title.trim();
    if (body.description !== undefined) input.description = body.description?.trim();
    if (body.contentType !== undefined) input.contentType = body.contentType;
    if (body.source !== undefined) input.source = body.source;
    if (body.metadata !== undefined) input.metadata = body.metadata;
    if (body.tags !== undefined) input.tags = Array.isArray(body.tags) ? body.tags : [];
    if (body.connections !== undefined) input.connections = Array.isArray(body.connections) ? body.connections : [];
    if (body.canonicalUrl !== undefined) input.canonicalUrl = body.canonicalUrl?.trim();
    if (body.contentFingerprint !== undefined) input.contentFingerprint = body.contentFingerprint?.trim();

    const updated = await updateSavedItem(user.id, id, input);

    if (!updated) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ item: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Authentication required" },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const deleted = await deleteSavedItem(user.id, id);

  if (!deleted) {
    return NextResponse.json(
      { error: "Item not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
