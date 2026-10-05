import Link from "next/link";
import Image from "next/image";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { signout } from "@/app/auth/actions";

export default async function Home() {
  const user = await getAuthenticatedUser();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#040D0A] text-[#F0FDF4] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#10B981]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Bar */}
      <header className="border-b border-[#16382E] bg-[#040D0A]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-[#081712] border border-[#16382E]">
              <Image
                src="/logo.png"
                alt="Echo Shelf Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#F0FDF4]">
                Echo Shelf
              </span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#0E241D] text-[#34D399] border border-[#16382E]">
                2.0
              </span>
            </div>
          </div>

          <div>
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/library"
                  className="py-1.5 px-3.5 rounded-lg bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] text-xs font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                >
                  My Vault
                </Link>
                <form action={signout}>
                  <button
                    type="submit"
                    className="py-1.5 px-3 rounded-lg border border-[#16382E] bg-[#081712] text-xs font-medium text-[#9FE1CB] hover:bg-[#0E241D] hover:text-[#F0FDF4] transition-colors"
                  >
                    Sign Out
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="py-1.5 px-3 text-xs font-semibold text-[#9FE1CB] hover:text-[#F0FDF4] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="py-1.5 px-3.5 rounded-lg bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center flex flex-col items-center relative z-10">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-6 rounded-2xl overflow-hidden p-1.5 bg-[#081712] border border-[#1E463A] shadow-[0_0_30px_rgba(16,185,129,0.25)]">
          <Image
            src="/logo.png"
            alt="Echo Shelf Emblem"
            width={96}
            height={96}
            className="w-full h-full object-contain"
            priority
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[#0E241D] border border-[#16382E] text-[#34D399] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
          <span>Capture &bull; Connect &bull; Resurface</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#F0FDF4] max-w-2xl leading-tight">
          Next-Generation Personal Intelligence Vault
        </h1>

        <p className="mt-4 text-sm sm:text-base text-[#9FE1CB]/80 max-w-xl leading-relaxed">
          Echo Shelf 2.0 provides isolated, secure, and structured asset storage
          with Gemma-powered intelligence, automated knowledge clustering, and
          contextual rediscovery.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {user ? (
            <Link
              href="/library"
              className="py-3 px-6 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(52,211,153,0.5)] active:scale-[0.98]"
            >
              Open Your Library &rarr;
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="py-3 px-6 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(52,211,153,0.5)] active:scale-[0.98]"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="py-3 px-6 rounded-xl border border-[#16382E] bg-[#081712] font-semibold text-[#F0FDF4] hover:bg-[#0E241D] hover:border-[#235343] transition-colors"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 text-left w-full">
          <div className="p-5 rounded-2xl border border-[#16382E] bg-[#081712]/90 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-[#0E241D] border border-[#16382E] flex items-center justify-center text-[#34D399] font-bold text-xs mb-3">
              01
            </div>
            <h2 className="font-semibold text-[#F0FDF4] text-sm">
              Smart Multi-Source Capture
            </h2>
            <p className="text-xs text-[#9FE1CB]/70 mt-1.5 leading-relaxed">
              Ingest URLs, repositories, videos, documents, images, and notes with automated Gemma synthesis.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-[#16382E] bg-[#081712]/90 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-[#0E241D] border border-[#16382E] flex items-center justify-center text-[#34D399] font-bold text-xs mb-3">
              02
            </div>
            <h2 className="font-semibold text-[#F0FDF4] text-sm">
              Knowledge Clusters
            </h2>
            <p className="text-xs text-[#9FE1CB]/70 mt-1.5 leading-relaxed">
              Synthesize themes across your vault into high-order conceptual clusters with AI topic tags.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-[#16382E] bg-[#081712]/90 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-[#0E241D] border border-[#16382E] flex items-center justify-center text-[#34D399] font-bold text-xs mb-3">
              03
            </div>
            <h2 className="font-semibold text-[#F0FDF4] text-sm">
              Contextual Rediscovery
            </h2>
            <p className="text-xs text-[#9FE1CB]/70 mt-1.5 leading-relaxed">
              Connect external breaking news developments directly to resurfaced items in your vault.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#16382E] py-6 text-center text-xs text-[#5E8275]">
        Echo Shelf 2.0 &bull; Personal Intelligence Vault
      </footer>
    </div>
  );
}
