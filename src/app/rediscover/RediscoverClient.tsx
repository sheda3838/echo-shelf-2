"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
          `Discovered ${count} current real-world event${count > 1 ? "s" : ""} relevant to your knowledge vault!`
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
    <div className="min-h-screen bg-[#040D0A] text-[#F0FDF4] flex flex-col">
      <Navigation userEmail={userEmail} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#16382E] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#F0FDF4]">
                Contextual Rediscovery
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0E241D] text-[#34D399] border border-[#16382E]">
                {results.length}
              </span>
            </div>
            <p className="text-xs text-[#9FE1CB]/70 mt-1 max-w-xl leading-relaxed">
              &ldquo;What is happening now that makes something I saved before relevant again?&rdquo; Cross-references live world events with your knowledge clusters.
            </p>
          </div>

          <button
            onClick={handleRunRediscovery}
            disabled={isRefreshing || clusterCount === 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] disabled:opacity-50 shrink-0 active:scale-[0.98]"
          >
            {isRefreshing ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-[#040D0A]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Scanning Live News...</span>
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
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 flex items-start gap-2">
            <span className="text-red-400 font-bold">•</span>
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-[#064E3B]/40 border border-[#10B981]/50 text-xs text-[#34D399] flex items-start gap-2">
            <span className="font-bold">✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Dependency Notice: Clusters required */}
        {clusterCount === 0 && (
          <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <div>
              <p className="font-bold text-sm text-amber-300">Knowledge Clusters Required</p>
              <p className="mt-1 text-amber-200/80 leading-relaxed">
                Contextual Rediscovery generates targeted search queries from your thematic Knowledge Clusters. Generate clusters first before running rediscovery.
              </p>
            </div>
            <Link
              href="/clusters"
              className="px-4 py-2 rounded-xl bg-amber-900/60 text-amber-200 border border-amber-700/60 font-semibold text-xs shrink-0 self-start sm:self-auto hover:bg-amber-800/80 transition-colors"
            >
              Go to Clusters &rarr;
            </Link>
          </div>
        )}

        {/* Rediscovery Results Grid */}
        {results.length === 0 ? (
          <div className="py-20 text-center bg-[#081712] border border-[#16382E] rounded-2xl p-8 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <div className="relative w-14 h-14 mb-2 mx-auto rounded-2xl overflow-hidden p-1 bg-[#0E241D] border border-[#1E463A]">
              <Image
                src="/logo.png"
                alt="Echo Shelf Emblem"
                width={56}
                height={56}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#F0FDF4]">
                No Contextual Resurfacing Yet
              </h3>
              <p className="text-xs text-[#9FE1CB]/70 max-w-md mx-auto leading-relaxed">
                Click &ldquo;Check What&apos;s Relevant Now&rdquo; above. Echo Shelf will query current news events related to your knowledge themes, evaluate them through semantic intelligence, and resurface connections with strict quality filtering.
              </p>
            </div>
            {clusterCount > 0 && (
              <button
                onClick={handleRunRediscovery}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)]"
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
                className="bg-[#081712] border border-[#16382E] hover:border-[#235343] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between space-y-5 transition-all group"
              >
                <div className="space-y-4">
                  {/* CURRENT ARTICLE / DEVELOPMENT */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#0E241D] text-[#34D399] border border-[#16382E]">
                          {res.relationshipType}
                        </span>
                        {res.relevance !== undefined && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              res.relevance >= 0.8
                                ? "bg-[#064E3B] text-[#34D399] border border-[#10B981]/40"
                                : "bg-[#16382E] text-[#9FE1CB] border border-[#235343]"
                            }`}
                          >
                            {res.relevance >= 0.8 ? "Strong Relevance" : "Moderate Relevance"}
                          </span>
                        )}
                      </div>

                      {res.article.source && (
                        <span className="text-[11px] font-medium text-[#5E8275]">
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
                          className="text-base font-bold text-[#F0FDF4] group-hover:text-[#34D399] hover:underline leading-snug line-clamp-2 block transition-colors"
                        >
                          {res.article.title}
                        </a>
                      ) : (
                        <span className="text-base font-bold text-[#F0FDF4] leading-snug line-clamp-2 block">
                          {res.article.title}
                        </span>
                      )}
                      {res.article.snippet && (
                        <p className="text-xs text-[#9FE1CB]/75 line-clamp-2 mt-1.5 leading-relaxed">
                          {res.article.snippet}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* WHY THIS MATTERS TO YOUR SHELF */}
                  <div className="p-3.5 rounded-xl bg-[#0E241D] border border-[#1E463A] space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#34D399] flex items-center gap-1.5">
                      <span>💡</span>
                      <span>Why this matters to your vault</span>
                    </span>
                    <p className="text-xs text-[#F0FDF4] leading-relaxed font-medium">
                      {res.explanation}
                    </p>
                  </div>
                </div>

                {/* RESURFACED SAVED KNOWLEDGE */}
                <div className="pt-4 border-t border-[#16382E] space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#5E8275]">
                    <span>Resurfaced Vault Asset</span>
                    {res.knowledgeClusterTitle && (
                      <span className="truncate max-w-[150px] text-[#9FE1CB]">
                        Cluster: {res.knowledgeClusterTitle}
                      </span>
                    )}
                  </div>

                  {res.savedItemId ? (
                    <Link
                      href={`/items/${res.savedItemId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/item flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#040D0A]/80 border border-[#16382E] hover:border-[#34D399]/40 hover:bg-[#0E241D] transition-colors"
                    >
                      <span className="text-xs font-semibold text-[#F0FDF4] group-hover/item:text-[#34D399] truncate transition-colors">
                        {res.savedItemTitle || "View Saved Item"}
                      </span>
                      {res.savedItemContentType && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#0E241D] text-[#34D399] uppercase border border-[#16382E] shrink-0">
                          {res.savedItemContentType}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <span className="text-xs text-[#5E8275] italic">Saved asset reference</span>
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
