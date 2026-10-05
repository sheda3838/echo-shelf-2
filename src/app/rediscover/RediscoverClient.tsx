"use client";

import { useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";

export interface RediscoveryResultItem {
  _id: string;
  article: {
    title: string;
    url: string;
    source?: string;
    publishedAt?: string;
    snippet?: string;
  };
  relevance?: number;
  relationshipType: string;
  explanation: string;
  savedItemId?: string;
  savedItemTitle?: string;
  savedItemContentType?: string;
  knowledgeClusterId?: string;
  knowledgeClusterTitle?: string;
  discoveredAt: string;
  createdAt: string;
}

interface RediscoverClientProps {
  initialResults: RediscoveryResultItem[];
  clusterCount: number;
  userEmail?: string;
}

export function RediscoverClient({
  initialResults,
  clusterCount,
  userEmail,
}: RediscoverClientProps) {
  const [results, setResults] = useState<RediscoveryResultItem[]>(initialResults);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRunRediscovery = async () => {
    setIsRefreshing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/rediscover", {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to run contextual rediscovery");
      }

      const data = await res.json();
      setResults(data.results || []);

      const count = data.results?.length || 0;
      if (count > 0) {
        setSuccessMessage(
          `Discovered ${count} current real-world event${count > 1 ? "s" : ""} relevant to your knowledge shelf!`
        );
      } else {
        setSuccessMessage(
          "Rediscovery completed: No current news stories strongly connected to your existing clusters right now. Irrelevant stories were filtered out."
        );
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while running rediscovery. Previous results preserved."
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <Navigation userEmail={userEmail} />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Contextual Rediscovery
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {results.length}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 max-w-xl">
              &ldquo;What is happening now that makes something I saved before relevant again?&rdquo; Cross-references live world events with your knowledge clusters using Gemma.
            </p>
          </div>

          <button
            onClick={handleRunRediscovery}
            disabled={isRefreshing || clusterCount === 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm disabled:opacity-50 shrink-0"
          >
            {isRefreshing ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Searching &amp; Reasoning with Gemma...</span>
              </>
            ) : (
              <>
                <span>📡</span>
                <span>{results.length > 0 ? "Check Again" : "Check What's Relevant Now"}</span>
              </>
            )}
          </button>
        </div>

        {/* Feedback banners */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
            {successMessage}
          </div>
        )}

        {/* Dependency Notice: Clusters required */}
        {clusterCount === 0 && (
          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm">Knowledge Clusters Required</p>
              <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                Contextual Rediscovery generates targeted search queries from your thematic Knowledge Clusters. Generate clusters first before running rediscovery.
              </p>
            </div>
            <Link
              href="/clusters"
              className="px-4 py-2 rounded-xl bg-amber-900 dark:bg-amber-100 text-white dark:text-amber-950 font-semibold text-xs shrink-0 self-start sm:self-auto hover:bg-amber-800 dark:hover:bg-amber-200 transition-colors"
            >
              Go to Clusters &rarr;
            </Link>
          </div>
        )}

        {/* Rediscovery Results Grid */}
        {results.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 mx-auto flex items-center justify-center text-xl">
              💡
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                No Contextual Resurfacing Yet
              </h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                Click &ldquo;Check What&apos;s Relevant Now&rdquo; above. Echo Shelf will query current news events related to your knowledge themes, evaluate them through Gemma, and resurface connections with strict quality filtering.
              </p>
            </div>
            {clusterCount > 0 && (
              <button
                onClick={handleRunRediscovery}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm"
              >
                <span>📡</span>
                <span>Check What&apos;s Relevant Now</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.map((res) => (
              <div
                key={res._id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
              >
                <div className="space-y-3">
                  {/* Relevance & Relationship Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                        {res.relationshipType}
                      </span>
                      {res.relevance !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            res.relevance >= 0.8
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                              : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                          }`}
                        >
                          {res.relevance >= 0.8 ? "Strong Relevance" : "Moderate Relevance"}
                        </span>
                      )}
                    </div>

                    {res.article.source && (
                      <span className="text-[11px] font-medium text-zinc-400">
                        {res.article.source}
                      </span>
                    )}
                  </div>

                  {/* Article Headline */}
                  <div>
                    {/^https?:\/\//i.test(res.article.url) ? (
                      <a
                        href={res.article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-bold text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 hover:underline leading-snug line-clamp-2 block"
                      >
                        {res.article.title}
                      </a>
                    ) : (
                      <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2 block">
                        {res.article.title}
                      </span>
                    )}
                    {res.article.snippet && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1.5 leading-relaxed">
                        {res.article.snippet}
                      </p>
                    )}
                  </div>

                  {/* "Why this matters to your shelf" Highlight */}
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      💡 Why this matters to your shelf
                    </span>
                    <p className="text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed font-medium">
                      {res.explanation}
                    </p>
                  </div>
                </div>

                {/* Footer: Connected Knowledge Asset */}
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Resurfaced Asset:</span>
                    {res.knowledgeClusterTitle && (
                      <span className="truncate max-w-[150px]">
                        Cluster: {res.knowledgeClusterTitle}
                      </span>
                    )}
                  </div>

                  {res.savedItemId ? (
                    <Link
                      href={`/items/${res.savedItemId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/item flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 truncate">
                        {res.savedItemTitle || "View Saved Item"}
                      </span>
                      {res.savedItemContentType && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 uppercase border border-zinc-200 dark:border-zinc-700 shrink-0">
                          {res.savedItemContentType}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <span className="text-xs text-zinc-400 italic">Saved asset reference</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
