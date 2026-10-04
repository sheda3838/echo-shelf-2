"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { CONTENT_TYPES, ContentType } from "@/types";

interface SavedItemData {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  contentType: ContentType;
  source: {
    type: "url" | "file" | "text";
    url?: string;
    fileName?: string;
    textSnippet?: string;
  };
  metadata?: {
    imageUrl?: string;
    author?: string;
    publishedAt?: string;
    siteName?: string;
    favicon?: string;
  };
  tags: string[];
  connections?: Array<{
    connectedItemId: string;
    relationshipType: string;
  }>;
  canonicalUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export function LibraryClient({
  initialItems = [],
}: {
  initialItems?: SavedItemData[];
}) {
  const [items, setItems] = useState<SavedItemData[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Editing state
  const [editingItem, setEditingItem] = useState<SavedItemData | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const refreshItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/items");
      if (!res.ok) {
        throw new Error("Failed to load saved items");
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching items");
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Content type filter
      if (selectedType !== "All" && item.contentType !== selectedType) {
        return false;
      }

      // Tag filter
      if (selectedTag && !item.tags?.includes(selectedTag)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query);
        const matchesTags = item.tags?.some((t) => t.toLowerCase().includes(query));
        const matchesSource = item.source?.url?.toLowerCase().includes(query);
        return matchesTitle || matchesDesc || matchesTags || matchesSource;
      }

      return true;
    });
  }, [items, selectedType, selectedTag, searchQuery]);

  const handleOpenEdit = (item: SavedItemData) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description || "");
    setEditTags(item.tags ? item.tags.join(", ") : "");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setIsUpdating(true);
      const tags = editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch(`/api/items/${editingItem._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          tags,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update item");
      }

      const { item } = await res.json();
      setItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, ...item } : i))
      );
      setEditingItem(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating item");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete item");
      }

      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting item");
    }
  };

  // Get content type color badge
  const getTypeBadgeColor = (type: ContentType) => {
    switch (type) {
      case "Article":
        return "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300";
      case "Video":
        return "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300";
      case "Repository":
        return "bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300";
      case "Document":
      case "PDF":
        return "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300";
      case "Note":
        return "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300";
      case "Image":
      case "Screenshot":
        return "bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300";
      default:
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300";
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Control Bar: Search & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Knowledge Vault
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {items.length} saved item{items.length !== 1 ? "s" : ""} securely indexed in your second brain
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshItems}
            disabled={loading}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <Link
            href="/add"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm"
          >
            <span>+</span>
            <span>Add Item</span>
          </Link>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title, description, tags, or URL..."
          className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-2.5 text-xs text-zinc-400 hover:text-zinc-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Content Type Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1">
        <button
          onClick={() => setSelectedType("All")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            selectedType === "All"
              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold"
              : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          All ({items.length})
        </button>

        {CONTENT_TYPES.map((type) => {
          const count = items.filter((i) => i.contentType === type).length;
          if (count === 0 && selectedType !== type) return null;
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedType === type
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold"
                  : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {type} ({count})
            </button>
          );
        })}

        {selectedTag && (
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
            <span>Tag: #{selectedTag}</span>
            <button
              onClick={() => setSelectedTag(null)}
              className="text-blue-500 hover:text-blue-700 ml-1 font-bold"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Items Grid with 16:9 Previews */}
      {loading && items.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 text-sm">
          Loading your knowledge vault...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-3">
          {items.length === 0 ? (
            <>
              <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                Your knowledge vault is empty
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Capture articles, videos, repositories, documents, or notes with Gemma-powered Smart Capture.
              </p>
              <Link
                href="/add"
                className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                + Add your first asset
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                No matching items found
              </p>
              <p className="text-xs text-zinc-500">
                Try clearing your search query or selecting a different content type filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedType("All");
                  setSelectedTag(null);
                }}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline pt-1"
              >
                Reset filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item._id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between transition-all group"
            >
              <div>
                {/* 16:9 Standardized Preview Card Header */}
                <Link
                  href={`/items/${item._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-800 overflow-hidden"
                >
                  {item.metadata?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.metadata.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
                        {item.contentType}
                      </span>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 line-clamp-1 mt-1 text-center font-medium">
                        {item.title}
                      </span>
                    </div>
                  )}

                  {/* Content type badge overlay */}
                  <div className="absolute top-2.5 left-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide shadow-sm uppercase ${getTypeBadgeColor(
                        item.contentType
                      )}`}
                    >
                      {item.contentType}
                    </span>
                  </div>

                  {/* Connections count overlay */}
                  {item.connections && item.connections.length > 0 && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-900/80 backdrop-blur text-white flex items-center gap-1 shadow-sm">
                        <span>🔗</span>
                        <span>{item.connections.length}</span>
                      </span>
                    </div>
                  )}
                </Link>

                {/* Card Content Body */}
                <div className="p-4 space-y-2">
                  <Link
                    href={`/items/${item._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 leading-snug"
                  >
                    {item.title}
                  </Link>

                  {item.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.tags.slice(0, 3).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                          #{tag}
                        </button>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="text-[10px] text-zinc-400 self-center">
                          +{item.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                <span className="text-[10px] text-zinc-400 font-mono">
                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/items/${item._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="px-2 py-1 text-xs font-medium rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item._id, item.title)}
                    className="px-2 py-1 text-xs font-medium rounded text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Edit Saved Knowledge Asset
            </h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
