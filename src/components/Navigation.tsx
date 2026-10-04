"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signout } from "@/app/auth/actions";

interface NavigationProps {
  userEmail?: string;
  userId?: string;
}

export function Navigation({ userEmail, userId }: NavigationProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Library", href: "/library" },
    { label: "Clusters", href: "/clusters" },
    { label: "Rediscover", href: "/rediscover" },
  ];

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand & Nav Links */}
        <div className="flex items-center gap-6">
          <Link href="/library" className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent">
              Echo Shelf
            </span>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              2.0
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/library" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Action Buttons & Profile */}
        <div className="flex items-center gap-3">
          <Link
            href="/add"
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm"
          >
            <span>+</span>
            <span>Add Item</span>
          </Link>

          {userEmail && (
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[140px]">
                {userEmail}
              </span>
              {userId && (
                <span className="text-[10px] font-mono text-zinc-400">
                  {userId.slice(0, 8)}...
                </span>
              )}
            </div>
          )}

          <form action={signout}>
            <button
              type="submit"
              className="py-1.5 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
