import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3.5", {
  variants: {
    variant: {
      default: "bg-primary-soft text-primary",
      accent: "bg-accent-soft text-accent",
      muted: "bg-muted text-muted-foreground",
      outline: "border border-border",
      solid: "bg-primary text-primary-foreground",
      glass: "bg-black/45 text-white backdrop-blur-md",
      danger: "bg-danger/15 text-danger",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
