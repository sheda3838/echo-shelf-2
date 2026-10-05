import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "brand" | "secondary" | "neutral" | "success" | "warning" | "error" | "info" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  children,
  variant = "brand",
  size = "sm",
  className = "",
  ...props
}: BadgeProps) {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  const variantClasses = {
    brand: "bg-[#064E3B]/60 text-[#34D399] border border-[#10B981]/30",
    secondary: "bg-[#0E241D] text-[#9FE1CB] border border-[#16382E]",
    neutral: "bg-[#0E241D]/80 text-[#94A3B8] border border-[#16382E]",
    success: "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40",
    warning: "bg-amber-950/60 text-amber-300 border border-amber-800/40",
    error: "bg-red-950/60 text-red-300 border border-red-800/40",
    info: "bg-cyan-950/60 text-cyan-300 border border-cyan-800/40",
    outline: "bg-transparent text-[#9FE1CB] border border-[#16382E]",
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-md tracking-tight ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
