import React from "react";
import Image from "next/image";

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  withLogo?: boolean;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  withLogo = false,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-[#16382E] bg-[#081712]/80 backdrop-blur-sm ${className}`}
    >
      {withLogo ? (
        <div className="relative w-14 h-14 mb-4 rounded-xl overflow-hidden p-1 bg-[#0E241D] border border-[#1E463A]">
          <Image
            src="/logo.png"
            alt="Echo Shelf Emblem"
            width={56}
            height={56}
            className="w-full h-full object-contain"
          />
        </div>
      ) : icon ? (
        <div className="w-12 h-12 mb-4 rounded-xl bg-[#0E241D] border border-[#1E463A] flex items-center justify-center text-[#34D399]">
          {icon}
        </div>
      ) : null}

      <h3 className="text-base sm:text-lg font-bold text-[#F0FDF4] tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-[#9FE1CB]/80 max-w-md mx-auto leading-relaxed mb-6">
        {description}
      </p>

      {action && <div>{action}</div>}
    </div>
  );
}
