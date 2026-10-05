"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
          `Successfully synthesized ${data.clusters.length} thematic knowledge clusters!`
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
    <div className="min-h-screen bg-[#040D0A] text-[#F0FDF4] flex flex-col">
      <Navigation userEmail={userEmail} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#16382E] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#F0FDF4]">
                Knowledge Clusters
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0E241D] text-[#34D399] border border-[#16382E]">
                {clusters.length}
              </span>
            </div>
            <p className="text-xs text-[#9FE1CB]/70 mt-1 max-w-xl leading-relaxed">
              High-level thematic groups synthesized across your vault. Connects disparate topics into unified conceptual pillars.
            </p>
          </div>

          <button
            onClick={handleGenerateClusters}
            disabled={isGenerating || totalSavedItems < 2}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] disabled:opacity-50 shrink-0 active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-[#040D0A]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Synthesizing Clusters...</span>
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

        {insufficientNotice && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-start gap-2">
            <span>ℹ️</span>
            <span>{insufficientNotice}</span>
          </div>
        )}

        {/* Total Items Notice */}
        {totalSavedItems < 2 && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              You have {totalSavedItems} saved item{totalSavedItems === 1 ? "" : "s"}. At least 2 saved assets are required to synthesize meaningful thematic clusters.
            </span>
            <Link
              href="/add"
              className="px-3 py-1.5 rounded-lg bg-amber-900/60 text-amber-200 border border-amber-700/60 font-semibold text-xs hover:bg-amber-800/80 transition-colors shrink-0 self-start sm:self-auto"
            >
              + Add Assets
            </Link>
          </div>
        )}

        {/* Clusters Content */}
        {clusters.length === 0 ? (
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
                {insufficientNotice ? "Not Enough Related Knowledge Yet" : "No Knowledge Clusters Yet"}
              </h3>
              <p className="text-xs text-[#9FE1CB]/70 max-w-md mx-auto leading-relaxed">
                {insufficientNotice ||
                  "Knowledge Clusters organize your articles, documents, videos, and notes into overarching mental models using semantic reasoning."}
              </p>
            </div>
            {totalSavedItems >= 2 && (
              <button
                onClick={handleGenerateClusters}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)]"
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
                className="bg-[#081712] border border-[#16382E] hover:border-[#235343] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between space-y-5 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-[#F0FDF4] group-hover:text-[#34D399] leading-snug transition-colors">
                      {cluster.title}
                    </h2>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#0E241D] text-[#34D399] border border-[#16382E] shrink-0">
                      {cluster.items?.length || 0} items
                    </span>
                  </div>

                  {cluster.summary && (
                    <p className="text-xs text-[#9FE1CB]/80 leading-relaxed">
                      {cluster.summary}
                    </p>
                  )}

                  {/* Tags */}
                  {cluster.tags && cluster.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {cluster.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#0E241D] text-[#9FE1CB] border border-[#16382E]/60"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Member Items Section */}
                <div className="pt-4 border-t border-[#16382E] space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5E8275] block">
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
                          className="group/item flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#040D0A]/70 border border-[#16382E]/60 hover:border-[#34D399]/40 hover:bg-[#0E241D] transition-colors"
                        >
                          <span className="text-xs font-semibold text-[#F0FDF4] group-hover/item:text-[#34D399] truncate transition-colors">
                            {item.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#0E241D] text-[#34D399] border border-[#16382E] shrink-0 uppercase">
                            {item.contentType}
                          </span>
                        </Link>
                      ))
                    ) : (
                      <p className="text-xs text-[#5E8275] italic">No assets assigned</p>
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
