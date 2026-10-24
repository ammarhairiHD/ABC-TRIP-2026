import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev-only: `npm run dev` here starts a fast Vite server with HMR. It proxies
// /api/* to `wrangler dev` (run separately) so the Opening screen's fetch to
// /api/journey works without CORS during day-to-day frontend iteration.
// This proxy is not used in production or in the combined `wrangler dev`
// check described in the repo README — there, the Worker serves everything
// from one origin and no proxy exists.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
});
