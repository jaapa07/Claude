"use client";
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;
export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("inline-flex gap-1 overflow-x-auto rounded-full bg-muted p-1 scrollbar-none", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-soft",
        className,
      )}
      {...props}
    />
  );
}
export const TabsContent = TabsPrimitive.Content;
