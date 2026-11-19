import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Clock, ExternalLink, MapPin, Plus, Trash2 } from "lucide-react";
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
import { activitiesQuery, bookingsQuery, expensesQuery, must, tripQuery, type Activity, type Trip } from "@/lib/trips-api";
import { BOOKING_KINDS, CATEGORIES, countdownLabel, formatDayLong, formatEur, formatRange, toDayString, tripDays } from "@/lib/trip-utils";

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
            <button aria-label="Șterge călătoria" onClick={removeTrip} className="rounded-full p-2 opacity-80 hover:bg-primary-foreground/10"><Trash2 className="size-5" /></button>
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

/* ---------------- Rezervări ---------------- */
const dtFmt = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Bookings({ trip }: { trip: Trip }) {
  const qc = useQueryClient();
  const { data: list = [] } = useQuery(bookingsQuery(trip.id));
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ kind: "zbor", provider: "", code: "", starts_at: "", price: "", link: "" });
  const save = useMutation({
    mutationFn: () => must(supabase.from("bookings").insert({
      trip_id: trip.id, kind: f.kind, provider: f.provider || null, code: f.code || null,
      starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null,
      price: f.price ? Number(f.price) : null, link: f.link || null,
    }).select()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings", trip.id] }); setOpen(false); setF({ kind: "zbor", provider: "", code: "", starts_at: "", price: "", link: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  async function remove(id: string) {
    if (!confirm("Ștergi rezervarea?")) return;
    await supabase.from("bookings").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["bookings", trip.id] });
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="space-y-3">
      <Button className="h-12 w-full rounded-2xl" onClick={() => setOpen(true)}><Plus /> Adaugă rezervare</Button>
      {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nicio rezervare încă.</p>}
      {list.map((b) => {
        const k = BOOKING_KINDS.find((x) => x.value === b.kind) ?? BOOKING_KINDS[0];
        return (
          <article key={b.id} className="rounded-3xl bg-card p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-xl" aria-hidden>{k.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{k.label}</p>
                <p className="font-medium">{b.provider || "—"}</p>
                {b.starts_at && <p className="text-sm text-muted-foreground">{dtFmt.format(new Date(b.starts_at))}</p>}
              </div>
              <button aria-label="Șterge rezervarea" onClick={() => remove(b.id)} className="p-1 text-muted-foreground"><Trash2 className="size-4" /></button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {b.code && (
                <button className="rounded-xl bg-muted px-3 py-1.5 font-mono text-sm font-semibold tracking-wider"
                  onClick={() => { navigator.clipboard?.writeText(b.code!); toast.success("Cod copiat"); }}>
                  {b.code}
                </button>
              )}
              {b.price != null && <span className="text-sm font-medium">{formatEur(Number(b.price))}</span>}
              {b.link && (
                <a href={b.link} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-sm text-primary">
                  Deschide <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          </article>
        );
      })}
      <FormDialog open={open} onOpenChange={setOpen} title="Rezervare nouă">
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
          <div className="space-y-2"><Label htmlFor="bd">Dată și oră</Label><Input id="bd" type="datetime-local" className="h-12" value={f.starts_at} onChange={set("starts_at")} /></div>
          <div className="space-y-2"><Label htmlFor="bpr">Preț (EUR)</Label><Input id="bpr" type="number" inputMode="decimal" min="0" step="0.01" className="h-12" value={f.price} onChange={set("price")} /></div>
          <div className="space-y-2"><Label htmlFor="bl">Link</Label><Input id="bl" type="url" className="h-12" value={f.link} onChange={set("link")} placeholder="https://" /></div>
          <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={save.isPending}>Salvează</Button>
        </form>
      </FormDialog>
    </div>
  );
}

/* ---------------- Buget ---------------- */
function Budget({ trip }: { trip: Trip }) {
  const qc = useQueryClient();
  const { data: list = [] } = useQuery(expensesQuery(trip.id));
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ category: "mancare", description: "", amount: "", spent_on: toDayString(new Date()) });
  const budget = Number(trip.budget);
  const spent = list.reduce((s, e) => s + Number(e.amount), 0);
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const over = budget > 0 && spent > budget;

  const save = useMutation({
    mutationFn: () => must(supabase.from("expenses").insert({
      trip_id: trip.id, category: f.category, description: f.description || null,
      amount: Number(f.amount), spent_on: f.spent_on,
    }).select()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses", trip.id] }); setOpen(false); setF({ ...f, description: "", amount: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  async function remove(id: string) {
    await supabase.from("expenses").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["expenses", trip.id] });
  }
  async function editBudget() {
    const v = prompt("Buget total (EUR)", String(budget));
    if (v == null || isNaN(Number(v))) return;
    await supabase.from("trips").update({ budget: Number(v) }).eq("id", trip.id);
    qc.invalidateQueries({ queryKey: ["trip", trip.id] });
    qc.invalidateQueries({ queryKey: ["trips"] });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-card p-5 shadow-soft">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cheltuit</p>
            <p className={`font-display text-3xl font-bold ${over ? "text-destructive" : ""}`}>{formatEur(spent)}</p>
          </div>
          <button onClick={editBudget} className="text-right">
            <p className="text-xs text-muted-foreground">din buget</p>
            <p className="font-semibold underline decoration-dotted underline-offset-4">{formatEur(budget)}</p>
          </button>
        </div>
        <Progress value={pct} className={`mt-4 h-3 ${over ? "[&>div]:bg-destructive" : "[&>div]:bg-accent"}`} />
        <p className="mt-2 text-sm text-muted-foreground">
          {budget <= 0 ? "Setează un buget atingând suma de mai sus." : over ? `Ai depășit bugetul cu ${formatEur(spent - budget)}` : `Rămas: ${formatEur(budget - spent)}`}
        </p>
      </section>

      <section className="rounded-3xl bg-card p-5 shadow-soft">
        <h3 className="mb-3 font-display text-lg font-bold">Pe categorii</h3>
        <ul className="space-y-3">
          {CATEGORIES.map((c) => {
            const v = list.filter((e) => e.category === c.value).reduce((s, e) => s + Number(e.amount), 0);
            return (
              <li key={c.value}>
                <div className="flex justify-between text-sm"><span>{c.label}</span><span className="font-medium">{formatEur(v)}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${spent > 0 ? (v / spent) * 100 : 0}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <Button className="h-12 w-full rounded-2xl" onClick={() => setOpen(true)}><Plus /> Adaugă cheltuială</Button>

      <ul className="space-y-2">
        {list.map((e) => (
          <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{e.description || CATEGORIES.find((c) => c.value === e.category)?.label}</p>
              <p className="text-xs text-muted-foreground">{CATEGORIES.find((c) => c.value === e.category)?.label} · {formatDayLong(e.spent_on)}</p>
            </div>
            <span className="font-semibold">{formatEur(Number(e.amount))}</span>
            <button aria-label="Șterge cheltuiala" onClick={() => remove(e.id)} className="p-1 text-muted-foreground"><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>

      <FormDialog open={open} onOpenChange={setOpen} title="Cheltuială nouă">
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="ea">Sumă (EUR)</Label><Input id="ea" required autoFocus type="number" inputMode="decimal" min="0" step="0.01" className="h-14 text-2xl" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
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
          <div className="space-y-2"><Label htmlFor="eo">Data</Label><Input id="eo" type="date" required className="h-12" value={f.spent_on} onChange={(e) => setF({ ...f, spent_on: e.target.value })} /></div>
          <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={save.isPending}>Salvează</Button>
        </form>
      </FormDialog>
    </div>
  );
}
