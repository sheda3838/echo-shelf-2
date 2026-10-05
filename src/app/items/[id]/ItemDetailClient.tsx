"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";

export interface SerializedConnection {
  connectedItemId: string;
  relationshipType: string;
  strength?: number;
  explanation?: string;
  connectedItemTitle?: string;
  connectedItemContentType?: string;
}

interface ProcessedConnectionItem {
  connectedItemId: string;
  relationshipType: string;
  strength: "strong" | "moderate";
  explanation: string;
  connectedItemTitle?: string;
}

export interface SerializedSavedItem {
  _id: string;
  title: string;
  description?: string;
  contentType: string;
  source: {
    type: "url" | "file" | "text";
    url?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
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
  connections: SerializedConnection[];
  canonicalUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ItemDetailClientProps {
  item: SerializedSavedItem;
  userEmail?: string;
}

export function ItemDetailClient({ item: initialItem, userEmail }: ItemDetailClientProps) {
  const router = useRouter();
  const [item, setItem] = useState<SerializedSavedItem>(initialItem);
  const [analyzingConnections, setAnalyzingConnections] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCheckConnections = async () => {
    setAnalyzingConnections(true);
    setConnectionMessage(null);

    try {
      const res = await fetch(`/api/items/${item._id}/connections`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to analyze connections");
      }

      const data = await res.json();
      const count = data.addedConnections?.length || 0;

      if (count > 0) {
        setConnectionMessage({
          type: "success",
          text: `Gemma discovered and added ${count} new semantic connection${count > 1 ? "s" : ""}!`,
        });
        setItem((prev) => ({
          ...prev,
          connections: [
            ...prev.connections,
            ...data.addedConnections.map((c: ProcessedConnectionItem) => ({
              connectedItemId: c.connectedItemId,
              relationshipType: c.relationshipType,
              strength: c.strength === "strong" ? 0.9 : 0.6,
              explanation: c.explanation,
              connectedItemTitle: c.connectedItemTitle,
            })),
          ],
        }));
        router.refresh();
      } else {
        setConnectionMessage({
          type: "info",
          text: "No new conceptual connections were found with your other saved items.",
        });
      }
    } catch (err: unknown) {
      setConnectionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error analyzing connections",
      });
    } finally {
      setAnalyzingConnections(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this saved knowledge asset?")) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/items/${item._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete item");
      }

      router.push("/library");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete item");
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <Navigation userEmail={userEmail} />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Back Link & Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <span>&larr;</span> Back to Library
          </Link>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 py-1.5 px-3 rounded-lg border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete Item"}
          </button>
        </div>

        {/* Item Header / Overview Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          {/* Optional 16:9 Preview */}
          {item.metadata?.imageUrl ? (
            <div className="aspect-video w-full bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-800 overflow-hidden relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.metadata.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[21/9] w-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-2xl font-bold tracking-tight text-zinc-300 dark:text-zinc-700 select-none">
                {item.contentType}
              </span>
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-6">
            {/* Meta badges row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
                  {item.contentType}
                </span>
                {item.metadata?.siteName && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {item.metadata.siteName}
                  </span>
                )}
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                Saved {new Date(item.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </span>
            </div>

            {/* Title & Description */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-snug">
                {item.title}
              </h1>
              {item.description && (
                <p className="mt-3 text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Source Information */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Source Reference
              </span>

              {item.source.type === "url" && item.source.url && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/^https?:\/\//i.test(item.source.url) ? (
                    <>
                      <a
                        href={item.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate"
                      >
                        {item.source.url}
                      </a>
                      <a
                        href={item.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shrink-0"
                      >
                        Open Original &rarr;
                      </a>
                    </>
                  ) : (
                    <span className="text-sm font-mono text-zinc-500 dark:text-zinc-400 truncate">
                      {item.source.url}
                    </span>
                  )}
                </div>
              )}

              {item.source.type === "file" && (
                <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300">
                  <span className="font-mono">{item.source.fileName || "Uploaded Document"}</span>
                  {item.source.fileSize && (
                    <span className="text-zinc-400">
                      {(item.source.fileSize / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
              )}

              {item.source.type === "text" && item.source.textSnippet && (
                <div className="max-h-60 overflow-y-auto p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {item.source.textSnippet}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Smart Connections Section */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Smart Connections
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {item.connections?.length || 0}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Gemma-powered semantic links between your saved knowledge assets.
              </p>
            </div>

            <button
              onClick={handleCheckConnections}
              disabled={analyzingConnections}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm disabled:opacity-50 shrink-0"
            >
              {analyzingConnections ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Analyzing with Gemma...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Check Connections</span>
                </>
              )}
            </button>
          </div>

          {/* Status Message */}
          {connectionMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium border ${
                connectionMessage.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : connectionMessage.type === "error"
                  ? "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800"
                  : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
              }`}
            >
              {connectionMessage.text}
            </div>
          )}

          {/* Connection Cards */}
          {item.connections && item.connections.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {item.connections.map((c, idx) => (
                <div
                  key={`${c.connectedItemId}-${idx}`}
                  className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                        {c.relationshipType}
                      </span>
                      {c.strength !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            c.strength >= 0.8
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                              : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                          }`}
                        >
                          {c.strength >= 0.8 ? "Strong" : "Moderate"}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/items/${c.connectedItemId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1"
                    >
                      <span>View Connected Item</span> &rarr;
                    </Link>
                  </div>

                  <Link
                    href={`/items/${c.connectedItemId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-semibold text-sm text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {c.connectedItemTitle || "Saved Item"}
                  </Link>

                  {c.explanation && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
                      💡 {c.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                No connections discovered yet.
              </p>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Click &ldquo;Check Connections&rdquo; above to let Gemma analyze your library and discover conceptual links, prerequisites, or complementary ideas.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
