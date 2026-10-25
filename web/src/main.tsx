import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { queryClient } from "./lib/queryClient";
import "./i18n";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);

// Cross-fade out the pure-CSS loader baked into index.html now that React
// has taken over -- see the #initial-loader block there for why it exists.
// On the first boot this browser session (index.html's inline script sets
// __abcBootStart and doesn't apply il-skip-boot), it's held up for at least
// 2s total -- a deliberate "game boot" beat, not just a loading indicator --
// before fading out; a repeat visit this session skips that wait (and is
// already hidden via CSS, so there's nothing to fade).
requestAnimationFrame(() => {
  const initialLoader = document.getElementById("initial-loader");
  if (!initialLoader) return;

  const bootStart = (window as { __abcBootStart?: number }).__abcBootStart;
  const elapsed = bootStart != null ? Date.now() - bootStart : Infinity;
  const remaining = bootStart != null ? Math.max(0, 2000 - elapsed) : 0;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  setTimeout(() => {
    initialLoader.classList.add("il-fade-out");
    setTimeout(() => initialLoader.remove(), reducedMotion ? 0 : 250);
  }, remaining);
});
