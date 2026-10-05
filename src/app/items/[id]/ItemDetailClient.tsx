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
          text: `Discovered and added ${count} new semantic connection${count > 1 ? "s" : ""} to your vault!`,
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
          text: "No new conceptual connections were found with your existing saved items.",
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
    <div className="min-h-screen bg-[#040D0A] text-[#F0FDF4] flex flex-col">
      <Navigation userEmail={userEmail} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Back Link & Actions */}
        <div className="flex items-center justify-between pb-2 border-b border-[#16382E]">
          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9FE1CB] hover:text-[#F0FDF4] transition-colors"
          >
            <span>&larr;</span>
            <span>Back to Library</span>
          </Link>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs font-medium text-red-400 hover:text-red-300 py-1.5 px-3 rounded-xl border border-red-900/60 bg-red-950/30 hover:bg-red-950/60 transition-colors disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete Item"}
          </button>
        </div>

        {/* Item Header / Overview Card */}
        <div className="bg-[#081712] border border-[#16382E] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          {/* Optional 16:9 Preview */}
          {item.metadata?.imageUrl ? (
            <div className="aspect-video w-full bg-[#0E241D] border-b border-[#16382E] overflow-hidden relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.metadata.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[21/9] w-full bg-gradient-to-br from-[#081712] to-[#0E241D] flex items-center justify-center border-b border-[#16382E]">
              <span className="text-xl sm:text-2xl font-bold tracking-widest text-[#16382E] uppercase select-none">
                {item.contentType}
              </span>
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-6">
            {/* Meta badges row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#0E241D] text-[#34D399] border border-[#16382E]">
                  {item.contentType}
                </span>
                {item.metadata?.siteName && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#040D0A] text-[#9FE1CB] border border-[#16382E]">
                    {item.metadata.siteName}
                  </span>
                )}
              </div>
              <span className="text-xs text-[#5E8275] font-mono">
                Saved {new Date(item.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </span>
            </div>

            {/* Title & Description */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F0FDF4] leading-snug">
                {item.title}
              </h1>
              {item.description && (
                <p className="mt-3 text-sm sm:text-base text-[#9FE1CB]/80 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#0E241D] text-[#9FE1CB] border border-[#16382E]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Source Information */}
            <div className="p-4 rounded-xl bg-[#040D0A]/70 border border-[#16382E] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5E8275] block">
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
                        className="text-xs sm:text-sm font-semibold text-[#34D399] hover:underline truncate"
                      >
                        {item.source.url}
                      </a>
                      <a
                        href={item.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E241D] hover:bg-[#16382E] text-[#34D399] border border-[#16382E] hover:border-[#235343] text-xs font-bold transition-colors shrink-0"
                      >
                        <span>Open Original</span>
                        <span>&rarr;</span>
                      </a>
                    </>
                  ) : (
                    <span className="text-xs font-mono text-[#5E8275] truncate">
                      {item.source.url}
                    </span>
                  )}
                </div>
              )}

              {item.source.type === "file" && (
                <div className="flex items-center justify-between text-xs text-[#F0FDF4]">
                  <span className="font-mono">{item.source.fileName || "Uploaded Document"}</span>
                  {item.source.fileSize && (
                    <span className="text-[#5E8275]">
                      {(item.source.fileSize / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
              )}

              {item.source.type === "text" && item.source.textSnippet && (
                <div className="max-h-60 overflow-y-auto p-3 rounded-lg bg-[#081712] border border-[#16382E] text-xs font-mono text-[#9FE1CB] whitespace-pre-wrap">
                  {item.source.textSnippet}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Smart Connections Section */}
        <div className="bg-[#081712] border border-[#16382E] rounded-2xl p-6 sm:p-8 space-y-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#16382E] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#F0FDF4]">
                  Smart Connections
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#0E241D] text-[#34D399] border border-[#16382E]">
                  {item.connections?.length || 0}
                </span>
              </div>
              <p className="text-xs text-[#9FE1CB]/70 mt-1">
                AI-powered semantic links connecting this asset to related knowledge across your vault.
              </p>
            </div>

            <button
              onClick={handleCheckConnections}
              disabled={analyzingConnections}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] disabled:opacity-50 shrink-0 active:scale-[0.98]"
            >
              {analyzingConnections ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-[#040D0A]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Analyzing Connections...</span>
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
                  ? "bg-[#064E3B]/40 text-[#34D399] border-[#10B981]/50"
                  : connectionMessage.type === "error"
                  ? "bg-red-950/40 text-red-300 border-red-900/60"
                  : "bg-[#0E241D] text-[#9FE1CB] border-[#16382E]"
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
                  className="p-4 rounded-xl border border-[#16382E] bg-[#040D0A]/70 hover:border-[#235343] transition-colors space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#0E241D] text-[#34D399] border border-[#16382E]">
                        {c.relationshipType}
                      </span>
                      {c.strength !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            c.strength >= 0.8
                              ? "bg-[#064E3B] text-[#34D399] border border-[#10B981]/40"
                              : "bg-[#16382E] text-[#9FE1CB] border border-[#235343]"
                          }`}
                        >
                          {c.strength >= 0.8 ? "Strong Match" : "Moderate Match"}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/items/${c.connectedItemId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#34D399] hover:underline flex items-center gap-1"
                    >
                      <span>View Connected Item</span>
                      <span>&rarr;</span>
                    </Link>
                  </div>

                  <Link
                    href={`/items/${c.connectedItemId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-bold text-sm text-[#F0FDF4] hover:text-[#34D399] transition-colors"
                  >
                    {c.connectedItemTitle || "Saved Item"}
                  </Link>

                  {c.explanation && (
                    <p className="text-xs text-[#9FE1CB]/85 leading-relaxed bg-[#081712] p-3 rounded-lg border border-[#16382E]">
                      💡 {c.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-semibold text-[#F0FDF4]">
                No connections discovered yet
              </p>
              <p className="text-xs text-[#9FE1CB]/70 max-w-md mx-auto leading-relaxed">
                Click &ldquo;Check Connections&rdquo; above to let the intelligence layer scan your library and discover conceptual links, prerequisites, or complementary ideas.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
