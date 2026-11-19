import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { packingQuery, must, type PackingItem } from "@/lib/trips-api";
import { PACKING_CATEGORIES, packingProgress } from "@/lib/trip-utils";

export function PackingList({ tripId }: { tripId: string }) {
  const qc = useQueryClient();
  const key = ["packing", tripId];
  const { data: items = [] } = useQuery(packingQuery(tripId));
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Documente");
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const add = useMutation({
    mutationFn: () => must(supabase.from("packing_items").insert({ trip_id: tripId, title: title.trim(), category: category.trim() || "Altele" }).select()),
    onSuccess: () => { setTitle(""); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  async function toggle(it: PackingItem) {
    qc.setQueryData<PackingItem[]>(key, (old = []) => old.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)));
    const { error } = await supabase.from("packing_items").update({ done: !it.done }).eq("id", it.id);
    if (error) toast.error(error.message);
    refresh();
  }
  async function remove(id: string) {
    await supabase.from("packing_items").delete().eq("id", id);
    refresh();
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim()) add.mutate();
  }

  const { done, total, pct } = packingProgress(items);
  const cats = [...new Set([...PACKING_CATEGORIES, ...items.map((i) => i.category)])].filter((c) => items.some((i) => i.category === c));

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-card p-5 shadow-soft">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pregătiri</p>
            <p className="font-display text-3xl font-bold">{pct}%</p>
          </div>
          <p className="text-sm text-muted-foreground">{done} din {total} bifate</p>
        </div>
        <Progress value={pct} className="mt-4 h-3 [&>div]:bg-accent" />
        {total > 0 && done === total && <p className="mt-2 text-sm font-medium">Totul e gata — drum bun! 🎒</p>}
      </section>

      <form onSubmit={submit} className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
        <div className="flex flex-wrap gap-2">
          {[...new Set([...PACKING_CATEGORIES, ...items.map((i) => i.category)])].map((c) => (
            <button type="button" key={c} onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1.5 text-sm ${category === c ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>
              {c}
            </button>
          ))}
        </div>
        <Input aria-label="Categorie" className="h-10" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="sau scrie o categorie nouă" />
        <div className="flex gap-2">
          <Input aria-label="Obiect" className="h-12" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Pașaport" />
          <Button type="submit" size="icon" className="size-12 shrink-0 rounded-xl" aria-label="Adaugă obiect" disabled={add.isPending}><Plus /></Button>
        </div>
      </form>

      {total === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Lista e goală. Adaugă primul obiect.</p>}
      {cats.map((c) => {
        const list = items.filter((i) => i.category === c);
        const d = list.filter((i) => i.done).length;
        return (
          <section key={c} className="rounded-3xl bg-card p-4 shadow-soft">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">{c}</h3>
              <span className="text-xs text-muted-foreground">{d}/{list.length}</span>
            </div>
            <ul className="divide-y">
              {list.map((it) => (
                <li key={it.id} className="flex items-center gap-3 py-2.5">
                  <Checkbox id={it.id} checked={it.done} onCheckedChange={() => toggle(it)} className="size-6 rounded-md" />
                  <label htmlFor={it.id} className={`flex-1 ${it.done ? "text-muted-foreground line-through" : ""}`}>{it.title}</label>
                  <button aria-label={`Șterge ${it.title}`} onClick={() => remove(it.id)} className="p-1 text-muted-foreground"><Trash2 className="size-4" /></button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
