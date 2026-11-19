import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Clock, ExternalLink, MapPin, MoreVertical, Pencil, Plus, Settings, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackingList } from "@/components/PackingList";
import { supabase } from "@/integrations/supabase/client";
import { activitiesQuery, bookingsQuery, expensesQuery, must, tripQuery, type Activity, type Booking, type Expense, type Trip } from "@/lib/trips-api";
import { BOOKING_KINDS, CATEGORIES, CURRENCIES, convertAmount, fetchRate, formatMoney, toLocalInput, countdownLabel, formatDayLong, formatEur, formatRange, toDayString, tripDays } from "@/lib/trip-utils";

export const Route = createFileRoute("/_authenticated/trip/$id")({
  head: () => ({
    meta: [
      { title: "Călătorie — Hai la drum" },
      { name: "description", content: "Itinerariu, rezervări și buget pentru călătoria ta." },
      { property: "og:title", content: "Călătorie — Hai la drum" },
      { property: "og:description", content: "Itinerariu, rezervări și buget pentru călătoria ta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TripPage,
});

function TripPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: trip, isLoading, error } = useQuery(tripQuery(id));

  async function removeTrip() {
    if (!confirm("Ștergi această călătorie cu tot conținutul ei?")) return;
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["trips"] });
    navigate({ to: "/trips", replace: true });
  }

  if (isLoading) return <p className="p-8 text-center text-muted-foreground">Se încarcă…</p>;
  if (error || !trip)
    return (
      <div className="p-8 text-center">
        <p>Călătoria nu a fost găsită.</p>
        <Link to="/trips" className="text-primary underline">Înapoi</Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="bg-hero px-5 pb-6 pt-6 text-primary-foreground">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center justify-between">
            <Link to="/trips" aria-label="Înapoi" className="-ml-2 rounded-full p-2 hover:bg-primary-foreground/10"><ArrowLeft /></Link>
            <div className="flex items-center">
            <TripSettings trip={trip} />
            <button aria-label="Șterge călătoria" onClick={removeTrip} className="rounded-full p-2 opacity-80 hover:bg-primary-foreground/10"><Trash2 className="size-5" /></button>
            </div>
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold">{trip.name}</h1>
          {trip.destination && <p className="mt-1 opacity-85">{trip.destination}</p>}
          <p className="mt-3 text-sm opacity-80">{formatRange(trip.start_date, trip.end_date)} · {countdownLabel(trip.start_date, trip.end_date)}</p>
        </div>
      </header>
      <Tabs defaultValue="itinerariu" className="mx-auto max-w-xl px-4">
        <TabsList className="sticky top-0 z-10 -mx-4 mt-0 grid h-14 w-[calc(100%+2rem)] grid-cols-4 rounded-none border-b bg-background/95 px-4 backdrop-blur">
          <TabsTrigger value="itinerariu" className="h-10 rounded-xl">Itinerariu</TabsTrigger>
          <TabsTrigger value="rezervari" className="h-10 rounded-xl">Rezervări</TabsTrigger>
          <TabsTrigger value="buget" className="h-10 rounded-xl">Buget</TabsTrigger>
          <TabsTrigger value="bagaje" className="h-10 rounded-xl">Bagaje</TabsTrigger>
        </TabsList>
        <TabsContent value="itinerariu" className="pt-4"><Itinerary trip={trip} /></TabsContent>
        <TabsContent value="rezervari" className="pt-4"><Bookings trip={trip} /></TabsContent>
        <TabsContent value="buget" className="pt-4"><Budget trip={trip} /></TabsContent>
        <TabsContent value="bagaje" className="pt-4"><PackingList tripId={trip.id} /></TabsContent>
      </Tabs>
    </div>
  );
}

function FormDialog({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader><DialogTitle className="font-display text-2xl">{title}</DialogTitle></DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Itinerariu ---------------- */
function Itinerary({ trip }: { trip: Trip }) {
  const qc = useQueryClient();
  const { data: acts = [] } = useQuery(activitiesQuery(trip.id));
  const [addDay, setAddDay] = useState<string | null>(null);
  const today = toDayString(new Date());
  const days = tripDays(trip.start_date, trip.end_date);
  const refresh = () => qc.invalidateQueries({ queryKey: ["activities", trip.id] });

  async function move(list: Activity[], i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const reordered = [...list];
    const [moved] = reordered.splice(i, 1);
    reordered.splice(j, 0, moved!);
    qc.setQueryData<Activity[]>(["activities", trip.id], (old = []) =>
      old.map((a) => { const k = reordered.findIndex((r) => r.id === a.id); return k >= 0 ? { ...a, position: k } : a; })
        .sort((a, b) => a.day.localeCompare(b.day) || a.position - b.position));
    const results = await Promise.all(reordered.map((a, k) => supabase.from("activities").update({ position: k }).eq("id", a.id)));
    if (results.some((r) => r.error)) toast.error("Nu am putut salva ordinea.");
    refresh();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) toast.error(error.message);
    refresh();
  }

  return (
    <div className="space-y-4">
      {days.map((day, idx) => {
        const list = acts.filter((a) => a.day === day);
        const isToday = day === today;
        return (
          <section key={day} className={`rounded-3xl bg-card p-4 shadow-soft ${isToday ? "ring-2 ring-accent" : ""}`}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ziua {idx + 1}{isToday && " · azi"}</p>
                <p className="font-display text-lg font-bold capitalize">{formatDayLong(day)}</p>
              </div>
              <Button size="icon" variant="secondary" className="rounded-full" aria-label="Adaugă activitate" onClick={() => setAddDay(day)}><Plus /></Button>
            </div>
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nicio activitate.</p>
            ) : (
              <ol className="space-y-2">
                {list.map((a, i) => (
                  <li key={a.id} className="flex gap-3 rounded-2xl bg-muted/60 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{a.title}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        {a.time && <span className="flex items-center gap-1"><Clock className="size-3.5" />{a.time.slice(0, 5)}</span>}
                        {a.location && (
                          <a className="flex items-center gap-1 underline-offset-2 hover:underline" target="_blank" rel="noreferrer"
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.location)}`}>
                            <MapPin className="size-3.5" />{a.location}
                          </a>
                        )}
                      </div>
                      {a.notes && <p className="mt-1 text-sm">{a.notes}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-center">
                      <button aria-label="Mută în sus" disabled={i === 0} onClick={() => move(list, i, -1)} className="rounded-lg p-1.5 disabled:opacity-25"><ChevronUp className="size-4" /></button>
                      <button aria-label="Mută în jos" disabled={i === list.length - 1} onClick={() => move(list, i, 1)} className="rounded-lg p-1.5 disabled:opacity-25"><ChevronDown className="size-4" /></button>
                      <button aria-label="Șterge activitatea" onClick={() => remove(a.id)} className="rounded-lg p-1.5 text-muted-foreground"><Trash2 className="size-4" /></button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
      <ActivityDialog tripId={trip.id} day={addDay} position={acts.filter((a) => a.day === addDay).length} onClose={() => setAddDay(null)} />
    </div>
  );
}

function ActivityDialog({ tripId, day, position, onClose }: { tripId: string; day: string | null; position: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ time: "", title: "", location: "", notes: "" });
  const save = useMutation({
    mutationFn: () => must(supabase.from("activities").insert({
      trip_id: tripId, day: day!, position, time: f.time || null, title: f.title,
      location: f.location || null, notes: f.notes || null,
    }).select()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["activities", tripId] }); setF({ time: "", title: "", location: "", notes: "" }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(); };
  return (
    <FormDialog open={!!day} onOpenChange={(o) => !o && onClose()} title="Activitate nouă">
      {day && <p className="-mt-2 text-sm capitalize text-muted-foreground">{formatDayLong(day)}</p>}
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-[7rem_1fr] gap-3">
          <div className="space-y-2"><Label htmlFor="at">Oră</Label><Input id="at" type="time" className="h-12" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="an">Titlu</Label><Input id="an" required className="h-12" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="al">Locație</Label><Input id="al" className="h-12" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="ao">Notițe</Label><Textarea id="ao" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={save.isPending}>Salvează</Button>
      </form>
    </FormDialog>
  );
}

function ItemMenu({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label={`Opțiuni ${label}`} onClick={(e) => e.stopPropagation()} className="rounded-lg p-1.5 text-muted-foreground"><MoreVertical className="size-4" /></button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={onEdit}><Pencil className="size-4" /> Editează</DropdownMenuItem>
        <DropdownMenuItem onSelect={onDelete} className="text-destructive"><Trash2 className="size-4" /> Șterge</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------------- Setări călătorie ---------------- */
function TripSettings({ trip }: { trip: Trip }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(trip.currency);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (cur === trip.currency) { setOpen(false); return; }
    setBusy(true);
    try {
      const { data: exps, error } = await supabase.from("expenses").select("*").eq("trip_id", trip.id);
      if (error) throw new Error(error.message);
      for (const e of exps ?? []) {
        const rate = await fetchRate(e.currency, cur, e.spent_on);
        const orig = Number(e.original_amount ?? e.amount);
        const r = await supabase.from("expenses").update({ rate, amount: convertAmount(orig, rate) }).eq("id", e.id);
        if (r.error) throw new Error(r.error.message);
      }
      const r = await supabase.from("trips").update({ currency: cur }).eq("id", trip.id);
      if (r.error) throw new Error(r.error.message);
      qc.invalidateQueries({ queryKey: ["trip", trip.id] });
      qc.invalidateQueries({ queryKey: ["expenses", trip.id] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Moneda a fost schimbată; cheltuielile au fost reconvertite.");
      setOpen(false);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <>
      <button aria-label="Setările călătoriei" onClick={() => { setCur(trip.currency); setOpen(true); }} className="rounded-full p-2 opacity-80 hover:bg-primary-foreground/10"><Settings className="size-5" /></button>
      <FormDialog open={open} onOpenChange={setOpen} title="Setări călătorie">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Moneda principală</Label>
            <Select value={cur} onValueChange={setCur}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Bugetul și totalurile se afișează în această monedă. Cheltuielile existente se reconvertesc la cursul zilei lor.</p>
          </div>
          <Button size="lg" className="h-12 w-full rounded-xl" disabled={busy} onClick={save}>{busy ? "Se salvează…" : "Salvează"}</Button>
        </div>
      </FormDialog>
    </>
  );
}

/* ---------------- Rezervări ---------------- */
const dtFmt = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const TIME_LABELS: Record<string, [string, string]> = {
  zbor: ["Plecare (dată și oră)", "Sosire (dată și oră)"],
  cazare: ["Check-in", "Check-out"],
  masina: ["Ridicare", "Predare"],
};
const emptyBooking = { kind: "zbor", provider: "", code: "", starts_at: "", ends_at: "", price: "", link: "" };

function Bookings({ trip }: { trip: Trip }) {
  const qc = useQueryClient();
  const { data: list = [] } = useQuery(bookingsQuery(trip.id));
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(emptyBooking);
  const save = useMutation({
    mutationFn: async () => {
      const row = {
        kind: f.kind, provider: f.provider || null, code: f.code || null,
        starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null,
        ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : null,
        price: f.price ? Number(f.price) : null, link: f.link || null,
      };
      return editId
        ? must(supabase.from("bookings").update(row).eq("id", editId).select())
        : must(supabase.from("bookings").insert({ ...row, trip_id: trip.id }).select());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings", trip.id] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  function startAdd() { setEditId(null); setF(emptyBooking); setOpen(true); }
  function startEdit(b: Booking) {
    setEditId(b.id);
    setF({ kind: b.kind, provider: b.provider ?? "", code: b.code ?? "", starts_at: toLocalInput(b.starts_at), ends_at: toLocalInput(b.ends_at),
      price: b.price != null ? String(b.price) : "", link: b.link ?? "" });
    setOpen(true);
  }
  async function remove(id: string) {
    if (!confirm("Ștergi rezervarea?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["bookings", trip.id] });
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const [l1, l2] = TIME_LABELS[f.kind] ?? TIME_LABELS["zbor"]!;

  return (
    <div className="space-y-3">
      <Button className="h-12 w-full rounded-2xl" onClick={startAdd}><Plus /> Adaugă rezervare</Button>
      {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nicio rezervare încă.</p>}
      {list.map((b) => {
        const k = BOOKING_KINDS.find((x) => x.value === b.kind) ?? BOOKING_KINDS[0];
        return (
          <article key={b.id} onClick={() => startEdit(b)} className="cursor-pointer rounded-3xl bg-card p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-xl" aria-hidden>{k.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{k.label}</p>
                <p className="font-medium">{b.provider || "—"}</p>
                {(b.starts_at || b.ends_at) && (
                  <p className="text-sm text-muted-foreground">
                    {b.starts_at ? dtFmt.format(new Date(b.starts_at)) : "—"}
                    {b.ends_at && ` → ${dtFmt.format(new Date(b.ends_at))}`}
                  </p>
                )}
              </div>
              <ItemMenu label="rezervare" onEdit={() => startEdit(b)} onDelete={() => remove(b.id)} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {b.code && (
                <button className="rounded-xl bg-muted px-3 py-1.5 font-mono text-sm font-semibold tracking-wider"
                  onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(b.code!); toast.success("Cod copiat"); }}>
                  {b.code}
                </button>
              )}
              {b.price != null && <span className="text-sm font-medium">{formatEur(Number(b.price))}</span>}
              {b.link && (
                <a href={b.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="ml-auto flex items-center gap-1 text-sm text-primary">
                  Deschide <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          </article>
        );
      })}
      <FormDialog open={open} onOpenChange={setOpen} title={editId ? "Editează rezervarea" : "Rezervare nouă"}>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label>Tip</Label>
            <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v })}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>{BOOKING_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.emoji} {k.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="bp">Furnizor</Label><Input id="bp" required className="h-12" value={f.provider} onChange={set("provider")} placeholder="ex. Wizz Air, Booking…" /></div>
          <div className="space-y-2"><Label htmlFor="bc">Cod de rezervare</Label><Input id="bc" className="h-12 font-mono uppercase" value={f.code} onChange={set("code")} /></div>
          <div className="space-y-2"><Label htmlFor="bd">{l1}</Label><Input id="bd" type="datetime-local" className="h-12" value={f.starts_at} onChange={set("starts_at")} /></div>
          <div className="space-y-2"><Label htmlFor="be">{l2}</Label><Input id="be" type="datetime-local" className="h-12" value={f.ends_at} onChange={set("ends_at")} /></div>
          <div className="space-y-2"><Label htmlFor="bpr">Preț (EUR)</Label><Input id="bpr" type="number" inputMode="decimal" min="0" step="0.01" className="h-12" value={f.price} onChange={set("price")} /></div>
          <div className="space-y-2"><Label htmlFor="bl">Link</Label><Input id="bl" type="url" className="h-12" value={f.link} onChange={set("link")} placeholder="https://" /></div>
          <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={save.isPending}>Salvează</Button>
        </form>
      </FormDialog>
    </div>
  );
}

/* ---------------- Buget ---------------- */
type ExpenseForm = { category: string; description: string; amount: string; currency: string; rate: string; spent_on: string };

function Budget({ trip }: { trip: Trip }) {
  const qc = useQueryClient();
  const main = trip.currency;
  const money = (n: number) => formatMoney(n, main);
  const { data: list = [] } = useQuery(expensesQuery(trip.id));
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const blank = (): ExpenseForm => ({ category: "mancare", description: "", amount: "", currency: "EUR", rate: "", spent_on: toDayString(new Date()) });
  const [f, setF] = useState<ExpenseForm>(blank);
  const [rateLoading, setRateLoading] = useState(false);
  const budget = Number(trip.budget);
  const spent = list.reduce((s, e) => s + Number(e.amount), 0);
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const over = budget > 0 && spent > budget;
  const foreign = f.currency !== main;

  async function loadRate(currency: string, day: string, next: ExpenseForm) {
    if (currency === main) { setF({ ...next, rate: "1" }); return; }
    setF({ ...next, rate: "" });
    setRateLoading(true);
    try {
      const r = await fetchRate(currency, main, day);
      setF((cur) => (cur.currency === currency && cur.spent_on === day ? { ...cur, rate: String(r) } : cur));
    } catch (e) { toast.error((e as Error).message + " Introdu cursul manual."); }
    finally { setRateLoading(false); }
  }

  const save = useMutation({
    mutationFn: async () => {
      const orig = Number(f.amount);
      const rate = foreign ? Number(f.rate) : 1;
      if (!(rate > 0)) throw new Error("Introdu un curs valutar valid.");
      const row = { category: f.category, description: f.description || null, original_amount: orig, currency: f.currency, rate, amount: convertAmount(orig, rate), spent_on: f.spent_on };
      return editId
        ? must(supabase.from("expenses").update(row).eq("id", editId).select())
        : must(supabase.from("expenses").insert({ ...row, trip_id: trip.id }).select());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses", trip.id] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  function startAdd() { setEditId(null); const b = blank(); setF(b); if (b.currency !== main) loadRate(b.currency, b.spent_on, b); setOpen(true); }
  function startEdit(e: Expense) {
    setEditId(e.id);
    setF({ category: e.category, description: e.description ?? "", amount: String(e.original_amount ?? e.amount), currency: e.currency, rate: String(e.rate), spent_on: e.spent_on });
    setOpen(true);
  }
  async function remove(id: string) {
    if (!confirm("Ștergi cheltuiala?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["expenses", trip.id] });
  }
  async function editBudget() {
    const v = prompt(`Buget total (${main})`, String(budget));
    if (v == null || isNaN(Number(v))) return;
    await supabase.from("trips").update({ budget: Number(v) }).eq("id", trip.id);
    qc.invalidateQueries({ queryKey: ["trip", trip.id] });
    qc.invalidateQueries({ queryKey: ["trips"] });
  }
  const preview = foreign && f.amount && Number(f.rate) > 0 ? convertAmount(Number(f.amount), Number(f.rate)) : null;

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-card p-5 shadow-soft">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cheltuit</p>
            <p className={`font-display text-3xl font-bold ${over ? "text-destructive" : ""}`}>{money(spent)}</p>
          </div>
          <button onClick={editBudget} className="text-right">
            <p className="text-xs text-muted-foreground">din buget</p>
            <p className="font-semibold underline decoration-dotted underline-offset-4">{money(budget)}</p>
          </button>
        </div>
        <Progress value={pct} className={`mt-4 h-3 ${over ? "[&>div]:bg-destructive" : "[&>div]:bg-accent"}`} />
        <p className="mt-2 text-sm text-muted-foreground">
          {budget <= 0 ? "Setează un buget atingând suma de mai sus." : over ? `Ai depășit bugetul cu ${money(spent - budget)}` : `Rămas: ${money(budget - spent)}`}
        </p>
      </section>

      <section className="rounded-3xl bg-card p-5 shadow-soft">
        <h3 className="mb-3 font-display text-lg font-bold">Pe categorii</h3>
        <ul className="space-y-3">
          {CATEGORIES.map((c) => {
            const v = list.filter((e) => e.category === c.value).reduce((s, e) => s + Number(e.amount), 0);
            return (
              <li key={c.value}>
                <div className="flex justify-between text-sm"><span>{c.label}</span><span className="font-medium">{money(v)}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${spent > 0 ? (v / spent) * 100 : 0}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <Button className="h-12 w-full rounded-2xl" onClick={startAdd}><Plus /> Adaugă cheltuială</Button>

      <ul className="space-y-2">
        {list.map((e) => {
          const orig = Number(e.original_amount ?? e.amount);
          return (
            <li key={e.id} onClick={() => startEdit(e)} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.description || CATEGORIES.find((c) => c.value === e.category)?.label}</p>
                <p className="text-xs text-muted-foreground">{CATEGORIES.find((c) => c.value === e.category)?.label} · {formatDayLong(e.spent_on)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatMoney(orig, e.currency)}</p>
                {e.currency !== main && <p className="text-xs text-muted-foreground">≈ {money(Number(e.amount))}</p>}
              </div>
              <ItemMenu label="cheltuială" onEdit={() => startEdit(e)} onDelete={() => remove(e.id)} />
            </li>
          );
        })}
      </ul>

      <FormDialog open={open} onOpenChange={setOpen} title={editId ? "Editează cheltuiala" : "Cheltuială nouă"}>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-[1fr_6.5rem] gap-2">
            <div className="space-y-2"><Label htmlFor="ea">Sumă</Label><Input id="ea" required autoFocus type="number" inputMode="decimal" min="0" step="0.01" className="h-14 text-2xl" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Monedă</Label>
              <Select value={f.currency} onValueChange={(v) => loadRate(v, f.spent_on, { ...f, currency: v })}>
                <SelectTrigger className="h-14" aria-label="Monedă"><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {foreign && (
            <div className="space-y-2 rounded-2xl bg-muted/60 p-3">
              <Label htmlFor="er">Curs: 1 {f.currency} = ? {main}</Label>
              <Input id="er" required type="number" inputMode="decimal" min="0" step="any" className="h-12" value={f.rate} placeholder={rateLoading ? "Se încarcă…" : ""} onChange={(e) => setF({ ...f, rate: e.target.value })} />
              <p className="text-xs text-muted-foreground">Cursul BCE al zilei (Frankfurter); îl poți modifica.{preview != null && ` ≈ ${money(preview)}`}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Categorie</Label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((c) => (
                <button type="button" key={c.value} onClick={() => setF({ ...f, category: c.value })}
                  className={`rounded-xl border px-2 py-2.5 text-sm ${f.category === c.value ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2"><Label htmlFor="ed">Descriere</Label><Input id="ed" className="h-12" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="eo">Data</Label><Input id="eo" type="date" required className="h-12" value={f.spent_on}
            onChange={(e) => { const next = { ...f, spent_on: e.target.value }; if (foreign && e.target.value) loadRate(f.currency, e.target.value, next); else setF(next); }} /></div>
          <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={save.isPending || (foreign && rateLoading)}>Salvează</Button>
        </form>
      </FormDialog>
    </div>
  );
}
