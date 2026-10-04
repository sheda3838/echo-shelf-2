import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { getSavedItemWithConnections } from "@/lib/services/saved-items.service";
import { ItemDetailClient, SerializedSavedItem } from "./ItemDetailClient";

interface ItemPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ItemPageProps) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return { title: "Item Detail - Echo Shelf" };

  const item = await getSavedItemWithConnections(user.id, id);
  if (!item) return { title: "Not Found - Echo Shelf" };

  return {
    title: `${item.title} - Echo Shelf`,
    description: item.description || "Saved item in Echo Shelf",
  };
}

export default async function ItemDetailPage({ params }: ItemPageProps) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const item = await getSavedItemWithConnections(user.id, id);

  if (!item) {
    notFound();
  }

  const serializedItem: SerializedSavedItem = {
    _id: item._id.toString(),
    title: item.title,
    description: item.description,
    contentType: item.contentType,
    source: {
      type: item.source.type,
      url: item.source.url,
      fileName: item.source.fileName,
      fileSize: item.source.fileSize,
      mimeType: item.source.mimeType,
      textSnippet: item.source.textSnippet,
    },
    metadata: item.metadata
      ? {
          imageUrl: item.metadata.imageUrl,
          author: item.metadata.author,
          publishedAt: item.metadata.publishedAt ? new Date(item.metadata.publishedAt).toISOString() : undefined,
          siteName: item.metadata.siteName,
          favicon: item.metadata.favicon,
        }
      : undefined,
    tags: item.tags || [],
    connections: (item.connections || []).map((c) => ({
      connectedItemId: c.connectedItemId,
      relationshipType: c.relationshipType,
      strength: c.strength,
      explanation: c.explanation,
      connectedItemTitle: c.connectedItemTitle,
      connectedItemContentType: c.connectedItemContentType,
    })),
    canonicalUrl: item.canonicalUrl,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
  };

  return <ItemDetailClient item={serializedItem} userEmail={user.email} />;
}
