import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { LogOut, Plus, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { tripsQuery, must, type Trip } from "@/lib/trips-api";
import { countdownLabel, daysUntil, formatEur, formatRange, isPastTrip } from "@/lib/trip-utils";

export const Route = createFileRoute("/_authenticated/trips")({
  head: () => ({
    meta: [
      { title: "Călătoriile mele — Hai la drum" },
      { name: "description", content: "Lista călătoriilor tale viitoare și trecute." },
      { property: "og:title", content: "Călătoriile mele — Hai la drum" },
      { property: "og:description", content: "Lista călătoriilor tale viitoare și trecute." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TripsPage,
});

function TripsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: trips = [], isLoading } = useQuery(tripsQuery());
  const [open, setOpen] = useState(false);

  const upcoming = trips.filter((t) => !isPastTrip(t.end_date));
  const past = trips.filter((t) => isPastTrip(t.end_date)).reverse();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-hero px-5 pb-8 pt-10 text-primary-foreground">
        <div className="mx-auto flex max-w-xl items-start justify-between">
          <div>
            <p className="text-sm opacity-80">Hai la drum</p>
            <h1 className="font-display text-3xl font-bold">Călătoriile mele</h1>
          </div>
          <Button size="icon" variant="ghost" aria-label="Ieși din cont" onClick={signOut}
            className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
            <LogOut />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-8 px-4 pt-6">
        {isLoading ? (
          <p className="text-center text-muted-foreground">Se încarcă…</p>
        ) : trips.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-8 text-center text-muted-foreground">
            Nicio călătorie încă. Apasă pe „Călătorie nouă”.
          </div>
        ) : (
          <>
            <Section title="Viitoare" trips={upcoming} empty="Nicio călătorie planificată." />
            {past.length > 0 && <Section title="Trecute" trips={past} muted />}
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-background via-background to-transparent px-4 pb-6 pt-8">
        <Button size="lg" className="mx-auto flex h-14 w-full max-w-xl rounded-2xl bg-accent text-base text-accent-foreground shadow-soft hover:bg-accent/90"
          onClick={() => setOpen(true)}>
          <Plus /> Călătorie nouă
        </Button>
      </div>
      <NewTripDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function Section({ title, trips, muted, empty }: { title: string; trips: Trip[]; muted?: boolean | undefined; empty?: string | undefined }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {trips.length === 0 && empty && <p className="text-sm text-muted-foreground">{empty}</p>}
      {trips.map((t) => <TripCard key={t.id} trip={t} muted={muted} />)}
    </section>
  );
}

function TripCard({ trip, muted }: { trip: Trip; muted?: boolean | undefined }) {
  const n = daysUntil(trip.start_date);
  return (
    <Link to="/trip/$id" params={{ id: trip.id }}
      className={`block rounded-3xl bg-card p-5 shadow-soft transition active:scale-[0.99] ${muted ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl font-bold">{trip.name}</h3>
          {trip.destination && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" /> <span className="truncate">{trip.destination}</span>
            </p>
          )}
          <p className="mt-2 text-sm">{formatRange(trip.start_date, trip.end_date)}</p>
        </div>
        <div className={`shrink-0 rounded-2xl px-3 py-2 text-center ${muted ? "bg-muted text-muted-foreground" : "bg-secondary text-secondary-foreground"}`}>
          {n > 1 ? (
            <>
              <p className="font-display text-2xl font-bold leading-none">{n}</p>
              <p className="text-[11px]">zile</p>
            </>
          ) : (
            <p className="text-xs font-semibold">{countdownLabel(trip.start_date, trip.end_date)}</p>
          )}
        </div>
      </div>
      {Number(trip.budget) > 0 && <p className="mt-3 text-xs text-muted-foreground">Buget {formatEur(Number(trip.budget))}</p>}
    </Link>
  );
}

function NewTripDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", destination: "", start_date: "", end_date: "", budget: "" });
  const create = useMutation({
    mutationFn: () =>
      must<Trip>(
        supabase.from("trips").insert({
          name: f.name, destination: f.destination || null, start_date: f.start_date,
          end_date: f.end_date, budget: Number(f.budget) || 0,
        }).select().single(),
      ),
    onSuccess: (trip) => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      onOpenChange(false);
      setF({ name: "", destination: "", start_date: "", end_date: "", budget: "" });
      navigate({ to: "/trip/$id", params: { id: trip.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    if (f.end_date < f.start_date) { toast.error("Data de sfârșit trebuie să fie după data de început."); return; }
    create.mutate();
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle className="font-display text-2xl">Călătorie nouă</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="n">Nume</Label><Input id="n" required className="h-12" value={f.name} onChange={set("name")} placeholder="ex. Vară în Grecia" /></div>
          <div className="space-y-2"><Label htmlFor="d">Destinație (opțional)</Label><Input id="d" className="h-12" value={f.destination} onChange={set("destination")} placeholder="ex. Atena → Creta" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="s">Început</Label><Input id="s" type="date" required className="h-12" value={f.start_date} onChange={set("start_date")} /></div>
            <div className="space-y-2"><Label htmlFor="e">Sfârșit</Label><Input id="e" type="date" required className="h-12" value={f.end_date} onChange={set("end_date")} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="b">Buget total (EUR)</Label><Input id="b" type="number" inputMode="decimal" min="0" step="1" className="h-12" value={f.budget} onChange={set("budget")} /></div>
          <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={create.isPending}>
            {create.isPending ? "Se salvează…" : "Creează călătoria"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
