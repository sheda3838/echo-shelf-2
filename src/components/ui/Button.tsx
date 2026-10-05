import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
      md: "h-9 px-4 text-xs font-semibold gap-2 rounded-lg",
      lg: "h-11 px-6 text-sm font-semibold gap-2 rounded-xl",
    }[size];

    const variantClasses = {
      primary:
        "bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] font-bold shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] active:scale-[0.98]",
      secondary:
        "bg-[#081712] hover:bg-[#0E241D] text-[#F0FDF4] border border-[#16382E] hover:border-[#235343] active:scale-[0.98]",
      ghost:
        "bg-transparent hover:bg-[#0E241D]/60 text-[#9FE1CB] hover:text-[#F0FDF4] border border-transparent",
      danger:
        "bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/50 hover:border-red-700/60 active:scale-[0.98]",
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center transition-all select-none focus-visible:outline-2 focus-visible:outline-[#34D399] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
