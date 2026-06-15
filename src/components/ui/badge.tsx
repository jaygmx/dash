import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center font-mono uppercase tracking-[0.15em] text-[10px] leading-none px-2 py-1 border",
  {
    variants: {
      variant: {
        default: "border-ink/40 text-foreground bg-transparent",
        accent: "border-accent text-accent bg-transparent",
        solid: "border-ink bg-ink text-paper",
        ghost: "border-transparent text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
