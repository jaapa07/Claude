"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, ClipboardCopy, Eraser, MessageCircle, Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import { api, errorMessage } from "@/lib/client";
import { formatQuantity, formatUnit } from "@/lib/units";
import { cn, GROUP_LABEL } from "@/lib/utils";
import { INGREDIENT_GROUPS, UNITS } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, NativeSelect } from "@/components/ui/input";
import { EmptyState, Spinner } from "@/components/ui/states";

type Group = (typeof INGREDIENT_GROUPS)[number];
type Item = { id: string; name: string; quantity: number | null; unit: string | null; group: Group; checked: boolean; recipeTitle: string | null };
type List = { id: string; name: string; items: Item[] };

const GROUP_EMOJI: Record<Group, string> = {
  HORTIFRUTI: "🥬",
  CARNES: "🥩",
  PEIXES: "🐟",
  LATICINIOS: "🧀",
  MERCEARIA: "🥫",
  PADARIA: "🥖",
  TEMPEROS: "🧂",
  BEBIDAS: "🥤",
  CONGELADOS: "🧊",
  OUTROS: "🛍️",
};

/** Quantidade + unidade legíveis (ex.: "1,5 kg", "2 xícaras", "3"). */
function qtyLabel(item: Pick<Item, "quantity" | "unit">): string {
  if (item.unit === "a gosto") return "a gosto";
  if (item.quantity == null) return item.unit ?? "";
  if (!item.unit) return formatQuantity(item.quantity, "unidade");
  const q = formatQuantity(item.quantity, item.unit);
  if (item.unit === "unidade") return item.quantity > 1 ? `${q} unidades` : `${q} unidade`;
  return `${q} ${formatUnit(item.unit, item.quantity)}`;
}

function itemText(item: Item) {
  const q = qtyLabel(item);
  return q ? `${item.name} — ${q}` : item.name;
}

const byName = (a: Item, b: Item) => a.name.localeCompare(b.name, "pt-BR");

export function ShoppingListView({ list }: { list: List }) {
  const router = useRouter();
  const [items, setItems] = React.useState<Item[]>(list.items);
  const [name, setName] = React.useState(list.name);
  const [editingName, setEditingName] = React.useState(false);
  const [busy, setBusy] = React.useState<"clear" | "delete" | "rename" | null>(null);

  const total = items.length;
  const checked = items.filter((i) => i.checked).length;
  const pct = total ? Math.round((checked / total) * 100) : 0;

  const groups = INGREDIENT_GROUPS.map((g) => ({
    group: g,
    items: items.filter((i) => i.group === g).sort((a, b) => Number(a.checked) - Number(b.checked) || byName(a, b)),
  })).filter((g) => g.items.length);

  const patchLocal = (id: string, data: Partial<Item>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...data } : x)));

  const toggle = async (item: Item, value: boolean) => {
    patchLocal(item.id, { checked: value });
    try {
      await api(`/api/shopping/${list.id}/items/${item.id}`, { method: "PATCH", body: { checked: value } });
    } catch (err) {
      patchLocal(item.id, { checked: item.checked });
      toast.error(errorMessage(err));
    }
  };

  const update = async (item: Item, data: { quantity: number | null; unit: string | null }) => {
    patchLocal(item.id, data);
    try {
      await api(`/api/shopping/${list.id}/items/${item.id}`, { method: "PATCH", body: data });
    } catch (err) {
      patchLocal(item.id, { quantity: item.quantity, unit: item.unit });
      toast.error(errorMessage(err));
    }
  };

  const removeItem = async (item: Item) => {
    setItems((xs) => xs.filter((x) => x.id !== item.id));
    try {
      await api(`/api/shopping/${list.id}/items/${item.id}`, { method: "DELETE" });
    } catch (err) {
      setItems((xs) => [...xs, item]);
      toast.error(errorMessage(err));
    }
  };

  const clearChecked = async () => {
    if (!checked) return;
    setBusy("clear");
    try {
      const res = await api<{ removed: number }>(`/api/shopping/${list.id}/items?checked=1`, { method: "DELETE" });
      setItems((xs) => xs.filter((x) => !x.checked));
      toast.success(`${res.removed} ite${res.removed === 1 ? "m removido" : "ns removidos"}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const rename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === list.name) return setEditingName(false);
    setBusy("rename");
    try {
      const res = await api<{ list: { name: string } }>(`/api/shopping/${list.id}`, { method: "PUT", body: { name } });
      setName(res.list.name);
      setEditingName(false);
      toast.success("Lista renomeada");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const deleteList = async () => {
    if (!confirm(`Excluir a lista “${name}”?`)) return;
    setBusy("delete");
    try {
      await api(`/api/shopping/${list.id}`, { method: "DELETE" });
      toast.success("Lista excluída");
      router.push("/compras");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(null);
    }
  };

  const shareText = () => {
    const pending = items.filter((i) => !i.checked);
    const source = pending.length ? pending : items;
    const lines = [`🛒 *${name}*`, ""];
    for (const g of INGREDIENT_GROUPS) {
      const gi = source.filter((i) => i.group === g).sort(byName);
      if (!gi.length) continue;
      lines.push(`${GROUP_EMOJI[g]} *${GROUP_LABEL[g]}*`);
      for (const i of gi) lines.push(`▫️ ${itemText(i)}`);
      lines.push("");
    }
    lines.push("Feito com Receita Viral");
    return lines.join("\n");
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, "_blank", "noopener,noreferrer");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText());
      toast.success("Lista copiada para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar. Tente pelo WhatsApp.");
    }
  };

  return (
    <>
      <Link href="/compras" className="no-print mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> Minhas listas
      </Link>

      <div className="flex items-start justify-between gap-3">
        {editingName ? (
          <form onSubmit={rename} className="flex flex-1 gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus aria-label="Nome da lista" />
            <Button type="submit" size="icon" disabled={busy === "rename"} aria-label="Salvar nome">{busy === "rename" ? <Spinner /> : <Check />}</Button>
            <Button type="button" size="icon" variant="ghost" onClick={() => { setName(list.name); setEditingName(false); }} aria-label="Cancelar">
              <X />
            </Button>
          </form>
        ) : (
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            {name}
            <button type="button" onClick={() => setEditingName(true)} className="no-print ml-2 inline-flex size-8 items-center justify-center rounded-full align-middle text-muted-foreground hover:bg-muted" aria-label="Renomear lista">
              <Pencil className="size-4" />
            </button>
          </h1>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{total ? `${checked} de ${total} itens no carrinho` : "Lista vazia"}</span>
          <span className="font-bold text-accent">{pct}%</span>
        </div>
        <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso das compras">
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        {total > 0 && checked === total && <p className="mt-2 text-sm font-semibold text-accent">Tudo comprado! 🎉</p>}
      </div>

      <div className="no-print mt-4 flex flex-wrap gap-2">
        <Button variant="accent" size="sm" onClick={shareWhatsApp} disabled={!total}><MessageCircle /> WhatsApp</Button>
        <Button variant="outline" size="sm" onClick={copy} disabled={!total}><ClipboardCopy /> Copiar</Button>
        <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!total}><Printer /> Imprimir</Button>
        <Button variant="outline" size="sm" onClick={clearChecked} disabled={!checked || busy !== null}>
          {busy === "clear" ? <Spinner /> : <Eraser />} Limpar marcados
        </Button>
        <Button variant="ghost" size="sm" className="text-danger" onClick={deleteList} disabled={busy !== null}>
          {busy === "delete" ? <Spinner /> : <Trash2 />} Excluir lista
        </Button>
      </div>

      <AddItemForm listId={list.id} onAdded={(item) => setItems((xs) => [...xs, item])} />

      {groups.length ? (
        <div className="mt-6 space-y-6">
          {groups.map(({ group, items: gi }) => (
            <section key={group} className="print-break">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                <span aria-hidden>{GROUP_EMOJI[group]}</span> {GROUP_LABEL[group]}
                <span className="font-medium normal-case">({gi.filter((i) => !i.checked).length})</span>
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                {gi.map((item) => (
                  <ItemRow key={item.id} item={item} onToggle={(v) => toggle(item, v)} onUpdate={(d) => update(item, d)} onRemove={() => removeItem(item)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-6"
          emoji="🧺"
          title="Nenhum item na lista"
          description="Adicione itens acima, gere pelo planejador ou use “Adicionar à lista de compras” na página de uma receita."
        />
      )}
    </>
  );
}

function ItemRow({
  item,
  onToggle,
  onUpdate,
  onRemove,
}: {
  item: Item;
  onToggle: (v: boolean) => void;
  onUpdate: (d: { quantity: number | null; unit: string | null }) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [qty, setQty] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const id = `item-${item.id}`;

  const startEdit = () => {
    setQty(item.quantity != null ? String(Math.round(item.quantity * 100) / 100) : "");
    setUnit(item.unit ?? "");
    setEditing(true);
  };

  const save = () => {
    const n = qty.trim() ? Number(qty.replace(",", ".")) : null;
    if (n !== null && (!Number.isFinite(n) || n <= 0)) {
      toast.error("Quantidade inválida");
      return;
    }
    setEditing(false);
    const u = unit.trim() || null;
    if (n !== item.quantity || u !== item.unit) onUpdate({ quantity: n, unit: u });
  };

  const q = qtyLabel(item);

  return (
    <li className={cn("flex items-center gap-3 px-4 py-3 transition", item.checked && "bg-muted/50")}>
      <Checkbox id={id} checked={item.checked} onCheckedChange={(v) => onToggle(v === true)} className="size-6" />
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className={cn("block font-medium", item.checked && "text-muted-foreground line-through")}>{item.name}</span>
        {item.recipeTitle && <span className="line-clamp-1 text-xs text-muted-foreground">{item.recipeTitle}</span>}
      </label>
      {editing ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
        >
          <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" className="h-9 w-16 px-2 text-right" aria-label="Quantidade" autoFocus />
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} list="rv-units" className="h-9 w-24 px-2" aria-label="Unidade" maxLength={30} />
          <Button type="submit" size="icon-sm" aria-label="Salvar quantidade"><Check /></Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className={cn(
            "shrink-0 rounded-lg px-2 py-1 text-sm font-semibold tabular-nums transition hover:bg-muted",
            item.checked ? "text-muted-foreground" : "text-foreground",
            !q && "text-muted-foreground",
          )}
          aria-label={`Editar quantidade de ${item.name}`}
          title="Editar quantidade"
        >
          {q || <span className="no-print text-xs font-medium">+ qtd.</span>}
        </button>
      )}
      <button type="button" onClick={onRemove} className="no-print inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-danger hover:text-white" aria-label={`Excluir ${item.name}`}>
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

function AddItemForm({ listId, onAdded }: { listId: string; onAdded: (item: Item) => void }) {
  const [name, setName] = React.useState("");
  const [qty, setQty] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [group, setGroup] = React.useState<Group>("OUTROS");
  const [busy, setBusy] = React.useState(false);
  const nameRef = React.useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return nameRef.current?.focus();
    const quantity = qty.trim() ? Number(qty.replace(",", ".")) : null;
    if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) return toast.error("Quantidade inválida");
    setBusy(true);
    try {
      const res = await api<{ item: Item }>(`/api/shopping/${listId}/items`, {
        body: { name: name.trim(), quantity, unit: unit.trim() || null, group },
      });
      onAdded(res.item);
      setName("");
      setQty("");
      setUnit("");
      nameRef.current?.focus();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="no-print mt-6 rounded-2xl border border-border bg-card p-3 shadow-soft">
      <datalist id="rv-units">
        {UNITS.map((u) => <option key={u} value={u} />)}
      </datalist>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
        <Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="Adicionar item…" maxLength={80} aria-label="Nome do item" className="col-span-6 sm:col-span-4" />
        <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qtd." inputMode="decimal" aria-label="Quantidade" className="col-span-2 sm:col-span-2" />
        <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unidade" list="rv-units" maxLength={30} aria-label="Unidade" className="col-span-4 sm:col-span-2" />
        <NativeSelect value={group} onChange={(e) => setGroup(e.target.value as Group)} aria-label="Categoria" className="col-span-4 sm:col-span-3">
          {INGREDIENT_GROUPS.map((g) => <option key={g} value={g}>{GROUP_LABEL[g]}</option>)}
        </NativeSelect>
        <Button type="submit" disabled={busy} className="col-span-2 h-11 w-full px-0 sm:col-span-1" aria-label="Adicionar item">
          {busy ? <Spinner /> : <Plus />}
        </Button>
      </div>
    </form>
  );
}
