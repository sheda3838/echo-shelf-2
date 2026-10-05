"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signup } from "@/app/auth/actions";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function SignupPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    // Client-side confirmation validation only
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please ensure both password fields match.");
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signup(formData);

    if (result?.error) {
      if (result.success) {
        setMessage(result.error);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#040D0A] p-4 relative overflow-hidden">
      {/* Subtle background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#081712] border border-[#16382E] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-6 sm:p-8 relative z-10">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="relative w-16 h-16 mb-4 rounded-2xl overflow-hidden p-1 bg-[#0E241D] border border-[#1E463A] shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Image
              src="/logo.png"
              alt="Echo Shelf Emblem"
              width={64}
              height={64}
              className="w-full h-full object-contain"
              priority
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#F0FDF4]">
            Create an Account
          </h1>
          <p className="text-xs sm:text-sm text-[#9FE1CB]/80 mt-1.5">
            Start saving your knowledge assets securely
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 flex items-start gap-2">
            <span className="text-red-400 font-bold">•</span>
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#064E3B]/40 border border-[#10B981]/60 text-xs text-[#34D399] flex items-start gap-2">
            <span className="font-bold">✓</span>
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-[11px] font-semibold uppercase tracking-wider text-[#9FE1CB] mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] placeholder-[#5E8275] focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] text-sm transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[11px] font-semibold uppercase tracking-wider text-[#9FE1CB] mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] placeholder-[#5E8275] focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] text-sm transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-[11px] font-semibold uppercase tracking-wider text-[#9FE1CB] mb-1.5"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] placeholder-[#5E8275] focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] text-sm transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] text-sm font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] disabled:opacity-50 active:scale-[0.99] mt-2"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#16382E]" />
          </div>
          <span className="relative px-3 bg-[#081712] text-[11px] text-[#5E8275] uppercase tracking-wider">
            Or continue with
          </span>
        </div>

        <GoogleSignInButton label="Sign up with Google" />

        <p className="mt-6 text-center text-xs text-[#9FE1CB]/70">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#34D399] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
