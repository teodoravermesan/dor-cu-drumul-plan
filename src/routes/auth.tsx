import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Autentificare — Hai la drum" },
      { name: "description", content: "Intră în cont sau creează unul nou pentru a-ți planifica călătoriile." },
      { property: "og:title", content: "Autentificare — Hai la drum" },
      { property: "og:description", content: "Intră în cont pentru a-ți vedea călătoriile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error("Email sau parolă greșită."); return; }
      navigate({ to: "/trips", replace: true });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      if (data.session) navigate({ to: "/trips", replace: true });
      else setSent(true);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-hero px-6 pb-16 pt-12 text-primary-foreground">
        <div className="mx-auto max-w-md">
          <p className="font-display text-lg font-bold">Hai la drum</p>
          <h1 className="mt-6 font-display text-3xl font-bold">
            {mode === "in" ? "Bine ai revenit!" : "Creează-ți contul"}
          </h1>
        </div>
      </div>
      <div className="mx-auto -mt-10 max-w-md px-4">
        <div className="rounded-3xl bg-card p-6 shadow-soft">
          {sent ? (
            <div className="space-y-3 text-center">
              <p className="font-display text-xl font-bold">Verifică-ți emailul</p>
              <p className="text-muted-foreground">
                Ți-am trimis un link de confirmare la <strong>{email}</strong>. După confirmare, revino și intră în cont.
              </p>
              <Button variant="outline" className="w-full" onClick={() => { setSent(false); setMode("in"); }}>
                Înapoi la autentificare
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" required className="h-12" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Parolă</Label>
                <Input id="password" type="password" minLength={6} required className="h-12"
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={busy}>
                {busy ? "Se încarcă…" : mode === "in" ? "Intră în cont" : "Creează cont"}
              </Button>
              <button type="button" className="w-full text-sm text-primary underline-offset-4 hover:underline"
                onClick={() => setMode(mode === "in" ? "up" : "in")}>
                {mode === "in" ? "Nu ai cont? Înregistrează-te" : "Ai deja cont? Intră"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
