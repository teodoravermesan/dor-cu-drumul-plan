// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [VitePWA({
      strategies: "generateSW",
      filename: "sw.js",
      // TanStack's browser output, not the SSR/Worker bundle.
      outDir: "dist/client",
      registerType: "autoUpdate",
      injectRegister: null,
      manifest: false,
      devOptions: { enabled: false },
      workbox: {
        globPatterns: ["assets/**/*.{js,css,woff,woff2}", "icons/*.png", "manifest.webmanifest"],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request, url, sameOrigin }) => sameOrigin && request.mode === "navigate"
              && !/^\/(?:~oauth|api)(?:\/|$)/.test(url.pathname),
            handler: "NetworkFirst",
            options: { cacheName: "dor-cu-drumul-pages", expiration: { maxEntries: 30, maxAgeSeconds: 604800 }, cacheableResponse: { statuses: [200] } },
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/.*-[\w-]{8,}\.(?:js|css|woff2?)$/.test(url.pathname),
            handler: "CacheFirst",
            options: { cacheName: "dor-cu-drumul-assets", expiration: { maxEntries: 100, maxAgeSeconds: 2592000 }, cacheableResponse: { statuses: [200] } },
          },
        ],
      },
    })],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
