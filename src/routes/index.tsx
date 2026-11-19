import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Plane, CalendarDays, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hai la drum — planifică-ți călătoriile" },
      { name: "description", content: "Itinerariu pe zile, rezervări și buget — totul într-un singur loc, optimizat pentru telefon." },
      { property: "og:title", content: "Hai la drum — planifică-ți călătoriile" },
      { property: "og:description", content: "Itinerariu pe zile, rezervări și buget, la îndemână în timpul călătoriei." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/trips", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-hero text-primary-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <p className="font-display text-lg font-bold">Hai la drum</p>
        <div className="flex flex-1 flex-col justify-center gap-6">
          <h1 className="font-display text-5xl font-bold leading-[1.05]">
            Călătoria ta,<br />în buzunar.
          </h1>
          <p className="text-lg opacity-85">
            Itinerariu pe zile, toate rezervările și bugetul — gândite pentru telefon, ca să le ai la îndemână pe drum.
          </p>
          <ul className="space-y-3 text-sm opacity-90">
            <li className="flex items-center gap-3"><CalendarDays className="size-5" /> Zile generate automat din date</li>
            <li className="flex items-center gap-3"><Plane className="size-5" /> Zboruri, cazări și mașini, cu coduri</li>
            <li className="flex items-center gap-3"><Wallet className="size-5" /> Cheltuieli pe categorii vs. buget</li>
          </ul>
        </div>
        <Button asChild size="lg" className="h-14 rounded-2xl bg-accent text-base text-accent-foreground hover:bg-accent/90">
          <Link to="/auth">Începe acum</Link>
        </Button>
      </div>
    </div>
  );
}
