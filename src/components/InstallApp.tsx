import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initializeAppWorker } from "@/lib/pwa";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void initializeAppWorker().catch(() => { /* Cache failure must not block the app. */ });
    const standalone = window.matchMedia("(display-mode: standalone)");
    const onPrompt = (event: Event) => {
      if (standalone.matches || (navigator as Navigator & { standalone?: boolean }).standalone) return;
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    standalone.addEventListener("change", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      standalone.removeEventListener("change", onInstalled);
    };
  }, []);

  if (!prompt) return null;
  return (
    <div className="flex justify-center bg-background px-4 py-3">
      <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            await prompt.prompt();
            await prompt.userChoice;
          } catch {
            // A dismissed or expired browser prompt must not interrupt the trip.
          } finally {
            setPrompt(null);
            setPending(false);
          }
        }}>
        <Download aria-hidden="true" /> Instalează aplicația
      </Button>
    </div>
  );
}