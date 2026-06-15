import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 sm:h-9 w-full appearance-none bg-transparent border border-ink/30 px-3 py-1 pr-8",
        // 16px on mobile prevents iOS Safari from auto-zooming on focus.
        "font-mono text-base sm:text-sm focus-ring transition-colors",
        "bg-[length:14px_14px] bg-no-repeat bg-[right_10px_center]",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>')]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export { Select };
