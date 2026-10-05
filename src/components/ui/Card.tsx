import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive";
}

export function Card({
  children,
  variant = "default",
  className = "",
  ...props
}: CardProps) {
  const variantClasses = {
    default: "bg-[#081712] border border-[#16382E]",
    elevated: "bg-[#0E241D] border border-[#1E463A] shadow-[0_8px_24px_rgba(0,0,0,0.4)]",
    interactive:
      "bg-[#081712] border border-[#16382E] hover:border-[#2A5A4B] hover:bg-[#0C1F18] hover:shadow-[0_8px_24px_rgba(16,185,129,0.06)] transition-all cursor-pointer",
  }[variant];

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
