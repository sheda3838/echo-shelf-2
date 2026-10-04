"use client";

import { useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";

export interface ClusterItem {
  _id: string;
  title: string;
  contentType: string;
}

export interface ClusterData {
  _id: string;
  title: string;
  summary?: string;
  tags: string[];
  items: ClusterItem[];
  createdAt: string;
  updatedAt: string;
}

interface ClustersClientProps {
  initialClusters: ClusterData[];
  totalSavedItems: number;
  userEmail?: string;
}

export function ClustersClient({
  initialClusters,
  totalSavedItems,
  userEmail,
}: ClustersClientProps) {
  const [clusters, setClusters] = useState<ClusterData[]>(initialClusters);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [insufficientNotice, setInsufficientNotice] = useState<string | null>(null);

  const handleGenerateClusters = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);
    setInsufficientNotice(null);

    try {
      const res = await fetch("/api/clusters", {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate knowledge clusters");
      }

      const data = await res.json();
      setClusters(data.clusters || []);
      if (data.clusters && data.clusters.length > 0) {
        setSuccessMessage(
          `Successfully generated ${data.clusters.length} thematic knowledge clusters!`
        );
      } else {
        setInsufficientNotice(
          data.message ||
            "Not enough related knowledge yet to create meaningful clusters. Save a few related items and try again."
        );
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while generating clusters. Previous clusters preserved."
      );
    } finally {
      setIsGenerating(false);
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
                Knowledge Clusters
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {clusters.length}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 max-w-xl">
              High-level thematic groups synthesized by Gemma across your saved assets. Connects disparate topics into unified conceptual pillars.
            </p>
          </div>

          <button
            onClick={handleGenerateClusters}
            disabled={isGenerating || totalSavedItems < 2}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm disabled:opacity-50 shrink-0"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Synthesizing with Gemma...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>{clusters.length > 0 ? "Refresh Clusters" : "Generate Clusters"}</span>
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

        {insufficientNotice && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
            {insufficientNotice}
          </div>
        )}

        {/* Total Items Notice */}
        {totalSavedItems < 2 && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <span>
              You have {totalSavedItems} saved item{totalSavedItems === 1 ? "" : "s"}. At least 2 saved assets are required to synthesize meaningful thematic clusters.
            </span>
            <Link
              href="/add"
              className="px-3 py-1 rounded-lg bg-amber-900 dark:bg-amber-100 text-white dark:text-amber-950 font-semibold text-[11px] shrink-0 ml-3"
            >
              + Add Assets
            </Link>
          </div>
        )}

        {/* Clusters Content */}
        {clusters.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 mx-auto flex items-center justify-center text-xl">
              🪐
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {insufficientNotice ? "Not Enough Related Knowledge Yet" : "No Knowledge Clusters Yet"}
              </h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                {insufficientNotice ||
                  "Knowledge Clusters organize your articles, documents, videos, and notes into overarching mental models using Gemma semantic reasoning."}
              </p>
            </div>
            {totalSavedItems >= 2 && (
              <button
                onClick={handleGenerateClusters}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm"
              >
                <span>✨</span>
                <span>Generate Initial Clusters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clusters.map((cluster) => (
              <div
                key={cluster._id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                      {cluster.title}
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                      {cluster.items?.length || 0} items
                    </span>
                  </div>

                  {cluster.summary && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {cluster.summary}
                    </p>
                  )}

                  {/* Tags */}
                  {cluster.tags && cluster.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {cluster.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Member Items Section */}
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                    Synthesized Assets
                  </span>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {cluster.items && cluster.items.length > 0 ? (
                      cluster.items.map((item) => (
                        <Link
                          key={item._id}
                          href={`/items/${item._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/item flex items-center justify-between gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 truncate">
                            {item.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white dark:bg-zinc-900 text-zinc-500 shrink-0 uppercase border border-zinc-200 dark:border-zinc-700/60">
                            {item.contentType}
                          </span>
                        </Link>
                      ))
                    ) : (
                      <p className="text-xs text-zinc-400 italic">No assets assigned</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
