"use client";

import Link from "next/link";
import Image from "next/image";
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
    <header className="border-b border-[#16382E] bg-[#040D0A]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Nav Links */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link
            href="/library"
            className="flex items-center gap-2.5 group focus-visible:outline-2 focus-visible:outline-[#34D399] rounded-lg p-0.5"
          >
            <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-[#081712] border border-[#16382E] group-hover:border-[#34D399]/60 transition-colors">
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
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#F0FDF4] group-hover:text-[#34D399] transition-colors">
                Echo Shelf
              </span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#0E241D] text-[#34D399] border border-[#16382E]">
                2.0
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/library" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#0E241D] text-[#34D399] border border-[#16382E] font-semibold shadow-[0_0_12px_rgba(16,185,129,0.12)]"
                      : "text-[#9FE1CB]/80 hover:text-[#F0FDF4] hover:bg-[#081712] border border-transparent"
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
            className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] active:scale-[0.98]"
          >
            <span className="text-sm leading-none">+</span>
            <span>Add Item</span>
          </Link>

          {userEmail && (
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-medium text-[#F0FDF4] truncate max-w-[150px]">
                {userEmail}
              </span>
              {userId && (
                <span className="text-[10px] font-mono text-[#5E8275]">
                  {userId.slice(0, 8)}...
                </span>
              )}
            </div>
          )}

          <form action={signout}>
            <button
              type="submit"
              className="py-1.5 px-2.5 rounded-lg border border-[#16382E] bg-[#081712] text-xs font-medium text-[#9FE1CB] hover:bg-[#0E241D] hover:text-[#F0FDF4] hover:border-[#235343] transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
