"use client";

import { useState, useCallback } from "react";
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
    textSnippet?: string;
  };
  tags: string[];
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

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState<ContentType>("Article");
  const [sourceType, setSourceType] = useState<"url" | "text">("url");
  const [sourceContent, setSourceContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing state
  const [editingItem, setEditingItem] = useState<SavedItemData | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const source =
        sourceType === "url"
          ? { type: "url" as const, url: sourceContent }
          : { type: "text" as const, textSnippet: sourceContent };

      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          contentType,
          source,
          canonicalUrl: sourceType === "url" ? sourceContent : undefined,
          tags,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create item");
      }

      const { item } = await res.json();
      setItems((prev) => [item, ...prev]);

      // Reset form
      setTitle("");
      setDescription("");
      setSourceContent("");
      setTagsInput("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating item");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        prev.map((i) => (i._id === item._id ? item : i))
      );
      setEditingItem(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating item");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this saved item?")) return;

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete item");
      }

      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error deleting item");
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Item Creation Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Save New Knowledge Asset
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Next.js Architecture Deep Dive"
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              >
                {CONTENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                Source Type
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as "url" | "text")}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              >
                <option value="url">Web URL</option>
                <option value="text">Text Snippet / Note</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                {sourceType === "url" ? "URL" : "Snippet / Text Content"}
              </label>
              <input
                type={sourceType === "url" ? "url" : "text"}
                value={sourceContent}
                onChange={(e) => setSourceContent(e.target.value)}
                placeholder={
                  sourceType === "url"
                    ? "https://example.com/article"
                    : "Notes, excerpt, or reference text..."
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary or note on why this matters"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="architecture, nextjs, security"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="py-2.5 px-5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Item"}
          </button>
        </form>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Edit Saved Item
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
                  className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm"
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
                  className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm"
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
                  className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Items List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Your Knowledge Vault ({items.length})
          </h2>
          <button
            onClick={refreshItems}
            disabled={loading}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading && items.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">
            Loading your saved items...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              Your vault is empty. Save your first item using the form above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => (
              <div
                key={item._id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                      {item.contentType}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base leading-snug">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  {item.source?.url && (
                    <a
                      href={item.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block truncate max-w-full"
                    >
                      {item.source.url}
                    </a>
                  )}
                  {item.source?.textSnippet && (
                    <p className="text-xs font-mono text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded mt-2 truncate">
                      {item.source.textSnippet}
                    </p>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="px-3 py-1 text-xs font-medium rounded border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="px-3 py-1 text-xs font-medium rounded border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
