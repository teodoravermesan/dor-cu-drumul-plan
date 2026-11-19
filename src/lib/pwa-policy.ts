/** Only the published app may own an app-shell service worker. */
export function shouldDisableAppWorker({ production, hostname, embedded, search }: {
  production: boolean; hostname: string; embedded: boolean; search: string;
}) {
  const host = hostname.toLowerCase();
  const previewDomain = /\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host);
  const firstLabel = host.split(".")[0] ?? "";
  return !production || embedded || new URLSearchParams(search).get("sw") === "off"
    || (previewDomain && (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(firstLabel)
      || /^project--.+-dev$/.test(firstLabel)))
    || ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"].some(
      domain => host === domain || host.endsWith(`.${domain}`),
    );
}