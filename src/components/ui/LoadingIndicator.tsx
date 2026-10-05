import React from "react";

export interface LoadingIndicatorProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingIndicator({
  label,
  size = "md",
  className = "",
}: LoadingIndicatorProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-10 h-10 border-3",
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`${sizeClasses} border-[#16382E] border-t-[#34D399] rounded-full animate-spin`}
      />
      {label && (
        <span className="text-xs font-medium text-[#9FE1CB]/90 animate-pulse tracking-wide">
          {label}
        </span>
      )}
    </div>
  );
}
