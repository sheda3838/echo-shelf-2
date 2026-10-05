"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 flex items-start gap-2">
          <span className="text-red-400 font-bold">•</span>
          <span>{error}</span>
        </div>
      )}

      {/* Control Bar: Search & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#16382E]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#F0FDF4]">
              Knowledge Vault
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#0E241D] text-[#34D399] border border-[#16382E]">
              {items.length}
            </span>
          </div>
          <p className="text-xs text-[#9FE1CB]/70 mt-1">
            Securely indexed knowledge assets, connections, and insights
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={refreshItems}
            disabled={loading}
            className="px-3 py-2 rounded-xl border border-[#16382E] bg-[#081712] text-xs font-semibold text-[#9FE1CB] hover:bg-[#0E241D] hover:text-[#F0FDF4] hover:border-[#235343] transition-colors disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <Link
            href="/add"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] active:scale-[0.98]"
          >
            <span className="text-sm leading-none">+</span>
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
          className="w-full px-4 py-2.5 rounded-xl border border-[#16382E] bg-[#081712] text-[#F0FDF4] placeholder-[#5E8275] text-sm focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] transition-colors shadow-inner"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-2.5 text-xs text-[#5E8275] hover:text-[#9FE1CB] px-1.5 py-0.5 rounded bg-[#0E241D]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Content Type Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1">
        <button
          onClick={() => setSelectedType("All")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedType === "All"
              ? "bg-[#10B981] text-[#040D0A] font-bold shadow-[0_0_12px_rgba(16,185,129,0.25)]"
              : "bg-[#081712] text-[#9FE1CB] border border-[#16382E] hover:border-[#235343] hover:bg-[#0E241D]"
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedType === type
                  ? "bg-[#10B981] text-[#040D0A] font-bold shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                  : "bg-[#081712] text-[#9FE1CB] border border-[#16382E] hover:border-[#235343] hover:bg-[#0E241D]"
              }`}
            >
              {type} ({count})
            </button>
          );
        })}

        {selectedTag && (
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0E241D] border border-[#10B981]/40 text-xs text-[#34D399]">
            <span>#{selectedTag}</span>
            <button
              onClick={() => setSelectedTag(null)}
              className="text-[#9FE1CB] hover:text-[#F0FDF4] ml-1 font-bold text-sm leading-none"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Items Grid with 16:9 Previews */}
      {loading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#5E8275] text-xs gap-3">
          <div className="w-6 h-6 border-2 border-[#16382E] border-t-[#34D399] rounded-full animate-spin" />
          <span>Loading knowledge vault...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-[#081712] border border-[#16382E] rounded-2xl p-8 space-y-4">
          {items.length === 0 ? (
            <div className="max-w-md mx-auto flex flex-col items-center">
              <div className="relative w-14 h-14 mb-3 rounded-2xl overflow-hidden p-1 bg-[#0E241D] border border-[#1E463A]">
                <Image
                  src="/logo.png"
                  alt="Echo Shelf Emblem"
                  width={56}
                  height={56}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-base font-bold text-[#F0FDF4]">
                Your knowledge vault is empty
              </p>
              <p className="text-xs text-[#9FE1CB]/70 mt-1 max-w-sm leading-relaxed">
                Capture articles, videos, repositories, documents, or notes with Gemma-powered Smart Capture.
              </p>
              <Link
                href="/add"
                className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)]"
              >
                + Add your first asset
              </Link>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <p className="text-sm font-semibold text-[#F0FDF4]">
                No matching items found
              </p>
              <p className="text-xs text-[#9FE1CB]/70 mt-1">
                Try clearing your search query or selecting a different content type filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedType("All");
                  setSelectedTag(null);
                }}
                className="mt-3 text-xs font-semibold text-[#34D399] hover:underline"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item._id}
              className="bg-[#081712] border border-[#16382E] hover:border-[#235343] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between transition-all group"
            >
              <div>
                {/* 16:9 Standardized Preview Card Header */}
                <Link
                  href={`/items/${item._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block relative aspect-video w-full bg-[#0E241D] border-b border-[#16382E] overflow-hidden"
                >
                  {item.metadata?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.metadata.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#081712] to-[#0E241D] relative">
                      <div className="w-10 h-10 rounded-xl bg-[#040D0A]/70 border border-[#16382E] flex items-center justify-center text-[#34D399] mb-2 font-bold text-xs uppercase tracking-wider">
                        {item.contentType.slice(0, 3)}
                      </div>
                      <span className="text-[11px] text-[#9FE1CB]/70 line-clamp-1 text-center font-medium max-w-[85%]">
                        {item.title}
                      </span>
                    </div>
                  )}

                  {/* Content type badge overlay */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[#040D0A]/85 backdrop-blur-sm text-[#34D399] border border-[#16382E] shadow-sm">
                      {item.contentType}
                    </span>
                  </div>

                  {/* Connections count overlay */}
                  {item.connections && item.connections.length > 0 && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#040D0A]/85 backdrop-blur-sm text-[#F0FDF4] border border-[#16382E] flex items-center gap-1 shadow-sm">
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
                    className="block font-bold text-sm text-[#F0FDF4] group-hover:text-[#34D399] line-clamp-2 leading-snug transition-colors"
                  >
                    {item.title}
                  </Link>

                  {item.description && (
                    <p className="text-xs text-[#9FE1CB]/75 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1.5">
                      {item.tags.slice(0, 3).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#0E241D] text-[#9FE1CB] hover:bg-[#16382E] hover:text-[#F0FDF4] border border-[#16382E]/60 transition-colors"
                        >
                          #{tag}
                        </button>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="text-[10px] text-[#5E8275] self-center">
                          +{item.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-4 py-3 border-t border-[#16382E] bg-[#06140F]/40 flex items-center justify-between text-xs">
                <span className="text-[10px] text-[#5E8275] font-mono">
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
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#0E241D] text-[#9FE1CB] hover:text-[#F0FDF4] hover:bg-[#16382E] border border-[#16382E] transition-colors"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="px-2 py-1 text-xs font-medium rounded text-[#5E8275] hover:text-[#9FE1CB] transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item._id, item.title)}
                    className="px-2 py-1 text-xs font-medium rounded text-red-400 hover:text-red-300 transition-colors"
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
        <div className="fixed inset-0 bg-[#040D0A]/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#081712] border border-[#16382E] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            <h3 className="text-base font-bold text-[#F0FDF4]">
              Edit Saved Knowledge Asset
            </h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9FE1CB] mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] text-sm focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9FE1CB] mb-1.5">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] text-sm focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9FE1CB] mb-1.5">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] text-sm focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] transition-colors"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl border border-[#16382E] bg-[#081712] text-xs font-semibold text-[#9FE1CB] hover:bg-[#0E241D] hover:text-[#F0FDF4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] text-xs font-bold transition-all disabled:opacity-50"
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
