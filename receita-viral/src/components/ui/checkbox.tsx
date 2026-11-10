"use client";
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn("flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-input bg-card transition data-[state=checked]:border-accent data-[state=checked]:bg-accent", className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="text-white">
        <Check className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
