import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { signout } from "@/app/auth/actions";

export default async function Home() {
  const user = await getAuthenticatedUser();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      {/* Top Bar */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight">Echo Shelf 2.0</span>
          </div>
          <div>
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/library"
                  className="py-1.5 px-3.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  My Vault
                </Link>
                <form action={signout}>
                  <button
                    type="submit"
                    className="py-1.5 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Sign Out
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="py-1.5 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="py-1.5 px-3.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 py-20 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Phase 1: Secure Architecture Foundation
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 max-w-2xl leading-tight">
          Next-Generation Personal Knowledge Vault
        </h1>

        <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl">
          Echo Shelf 2.0 provides isolated, secure, and structured asset storage
          built on Supabase Authentication and a dedicated MongoDB data layer.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {user ? (
            <Link
              href="/library"
              className="py-3 px-6 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              Open Your Library &rarr;
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="py-3 px-6 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="py-3 px-6 rounded-xl border border-zinc-300 dark:border-zinc-700 font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Foundation Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 text-left w-full">
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
              Server-Verified Auth
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Supabase SSR authentication with server-side token verification and zero client trust.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
              Strict User Isolation
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Centralized data access layer scoping all queries by authenticated user ID from day one.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
              Scalable MongoDB Layer
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Strong domain models for SavedItems, embedded connections, clusters, and rediscovery.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-400">
        Echo Shelf 2.0 &bull; Built for Hacktoberfest 2026 Weekend Challenge
      </footer>
    </div>
  );
}
