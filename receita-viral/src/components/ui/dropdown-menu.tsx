"use client";
import * as React from "react";
import * as DM from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;

export function DropdownMenuContent({ className, sideOffset = 8, ...props }: React.ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        sideOffset={sideOffset}
        className={cn("z-50 min-w-52 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-lift animate-fade-up", className)}
        {...props}
      />
    </DM.Portal>
  );
}
export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof DM.Item>) {
  return (
    <DM.Item
      className={cn("flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground", className)}
      {...props}
    />
  );
}
export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof DM.Label>) {
  return <DM.Label className={cn("px-3 py-2 text-xs text-muted-foreground", className)} {...props} />;
}
export function DropdownMenuSeparator() {
  return <DM.Separator className="my-1 h-px bg-border" />;
}
