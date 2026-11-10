"use client";
import * as React from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { cn } from "@/lib/utils";

/** Envia um arquivo para POST /api/uploads e devolve a URL pública. */
export async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body: fd, credentials: "same-origin" });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Falha no envio do arquivo");
  return data.url;
}

export function UploadButton({
  accept,
  onUploaded,
  label = "Enviar",
  disabled,
}: {
  accept: string;
  onUploaded: (url: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadFile(file);
      onUploaded(url);
      toast.success("Arquivo enviado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no envio do arquivo");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={onChange} />
      <Button type="button" variant="outline" disabled={disabled || busy} onClick={() => ref.current?.click()}>
        {busy ? <Spinner /> : <Upload />}
        {busy ? "Enviando…" : label}
      </Button>
    </>
  );
}

/** Campo de imagem: URL + botão de upload + pré-visualização. */
export function ImageField({
  id,
  value,
  onChange,
  invalid,
  className,
}: {
  id?: string;
  value: string;
  onChange: (url: string) => void;
  invalid?: boolean;
  className?: string;
}) {
  const [broken, setBroken] = React.useState(false);
  React.useEffect(() => setBroken(false), [value]);
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start", className)}>
      <div className="relative flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted sm:w-40">
        {value && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Pré-visualização" className="size-full object-cover" onError={() => setBroken(true)} />
        ) : (
          <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            <ImageIcon className="size-6" />
            {broken ? "Não foi possível carregar" : "Sem imagem"}
          </div>
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 rounded-full bg-black/55 p-1 text-white hover:bg-black/70"
            aria-label="Remover imagem"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… ou envie um arquivo"
          aria-invalid={invalid || undefined}
          className={cn(invalid && "border-danger")}
        />
        <div>
          <UploadButton accept="image/jpeg,image/png,image/webp,image/gif" label="Enviar imagem" onUploaded={onChange} />
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG, WEBP ou GIF. Use apenas imagens próprias ou com autorização.</p>
      </div>
    </div>
  );
}
