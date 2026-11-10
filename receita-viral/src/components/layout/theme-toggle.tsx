"use client";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/providers";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex size-10 items-center justify-center rounded-full hover:bg-muted" aria-label="Alterar tema">
        {resolved === "dark" ? <Moon className="size-5" /> : <Sun className="size-5" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem onSelect={() => setTheme("light")}><Sun /> Claro</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("dark")}><Moon /> Escuro</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("system")}><Monitor /> Sistema</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
