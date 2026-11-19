import { shouldDisableAppWorker } from "./pwa-policy";

/** The sole registrar; keep messaging workers and their caches untouched. */
export async function initializeAppWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (shouldDisableAppWorker({
    production: import.meta.env.PROD,
    hostname: window.location.hostname.toLowerCase(),
    embedded: window.self !== window.top,
    search: window.location.search,
  })) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter(registration =>
      [registration.active, registration.waiting, registration.installing].some(worker => {
        if (!worker) return false;
        const url = new URL(worker.scriptURL);
        return url.origin === window.location.origin && url.pathname === "/sw.js";
      }),
    ).map(registration => registration.unregister()));
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
}