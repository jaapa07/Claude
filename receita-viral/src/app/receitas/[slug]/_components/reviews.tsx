"use client";
import * as React from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/providers";
import { Avatar } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { Stars } from "@/components/recipe/stars";
import { api, errorMessage } from "@/lib/client";
import { cn } from "@/lib/utils";

type Comment = { id: string; text: string; createdAt: string; status?: string; user: { id: string; name: string; avatarUrl: string | null } };

export function Reviews({
  recipeId,
  initialAverage,
  initialCount,
  myRating,
  initialComments,
}: {
  recipeId: string;
  initialAverage: number;
  initialCount: number;
  myRating: number | null;
  initialComments: Comment[];
}) {
  const user = useSession();
  const [avg, setAvg] = React.useState(initialAverage);
  const [count, setCount] = React.useState(initialCount);
  const [mine, setMine] = React.useState(myRating ?? 0);
  const [hover, setHover] = React.useState(0);
  const [comments, setComments] = React.useState(initialComments);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const rate = async (stars: number) => {
    if (!user) return toast("Entre para avaliar receitas");
    const prev = mine;
    setMine(stars);
    try {
      const res = await api<{ average: number; count: number }>(`/api/recipes/${recipeId}/rating`, { method: "PUT", body: { stars } });
      setAvg(res.average);
      setCount(res.count);
      toast.success("Obrigado pela avaliação! ⭐");
    } catch (e) {
      setMine(prev);
      toast.error(errorMessage(e));
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await api<{ comment: Comment }>(`/api/recipes/${recipeId}/comments`, { body: { text } });
      if (res.comment.status === "PENDING") toast("Comentário enviado para moderação (contém link).");
      else {
        setComments((c) => [res.comment, ...c]);
        toast.success("Comentário publicado");
      }
      setText("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="space-y-6" id="avaliacoes">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Avaliações e comentários</h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Stars value={avg} size="md" />
            {count > 0 ? <span><strong className="text-foreground">{avg.toFixed(1)}</strong> de 5 · {count} {count === 1 ? "avaliação" : "avaliações"}</span> : <span>Ainda sem avaliações</span>}
          </div>
        </div>
        <div className="no-print rounded-2xl bg-muted px-4 py-3">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">{mine ? "Sua avaliação" : "Avalie esta receita"}</p>
          <div className="flex" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" onMouseEnter={() => setHover(s)} onClick={() => rate(s)} aria-label={`${s} estrela${s > 1 ? "s" : ""}`} className="p-0.5 transition active:scale-90">
                <Star className={cn("size-7", (hover || mine) >= s ? "text-star" : "text-muted-foreground/30")} fill="currentColor" strokeWidth={0} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {user ? (
        <form onSubmit={send} className="no-print flex gap-3">
          <Avatar name={user.name} url={user.avatarUrl} className="size-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Conte como ficou, dicas e adaptações…" maxLength={1000} required minLength={2} />
            <Button type="submit" disabled={sending || text.trim().length < 2} size="sm">{sending ? "Enviando…" : "Publicar comentário"}</Button>
          </div>
        </form>
      ) : (
        <p className="no-print rounded-2xl bg-muted p-4 text-sm">
          <Link href="/entrar" className="font-semibold text-primary">Entre</Link> ou <Link href="/cadastro" className="font-semibold text-primary">crie uma conta</Link> para avaliar e comentar.
        </p>
      )}

      {comments.length === 0 ? (
        <EmptyState emoji="💬" title="Nenhum comentário ainda" description="Já fez esta receita? Conte para a comunidade como ficou!" />
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.user.name} url={c.user.avatarUrl} className="size-10 shrink-0" />
              <div className="flex-1 rounded-2xl bg-card p-4 shadow-soft">
                <p className="text-sm font-semibold">
                  {c.user.name} <span className="ml-1 text-xs font-normal text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("pt-BR")}</span>
                </p>
                <p className="mt-1 whitespace-pre-line text-sm">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
