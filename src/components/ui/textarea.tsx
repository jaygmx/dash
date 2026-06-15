import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full bg-transparent border border-ink/30 px-3 py-2",
        // 16px on mobile prevents iOS Safari from auto-zooming on focus.
        "font-mono text-base sm:text-sm placeholder:text-muted-foreground",
        "focus-ring transition-colors disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
