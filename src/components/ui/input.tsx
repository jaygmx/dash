import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 sm:h-9 w-full bg-transparent border border-ink/30 px-3 py-1",
        // 16px on mobile prevents iOS Safari from auto-zooming on focus.
        "font-mono text-base sm:text-sm placeholder:text-muted-foreground placeholder:tracking-wide",
        "focus-ring transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
