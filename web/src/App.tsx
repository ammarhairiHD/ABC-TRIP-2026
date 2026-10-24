import { Route, Routes } from "react-router-dom";
import { Opening } from "./screens/Opening";
import { JourneyMap } from "./screens/JourneyMap";

/**
 * /ms and /ne prefixes are wired up per root CLAUDE.md so routing doesn't
 * need to change when those languages turn on, but every prefix renders the
 * same English screens for now (i18next is pinned to "en" - see src/i18n).
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Opening />} />
      <Route path="/climb" element={<JourneyMap />} />
      <Route path="/ms" element={<Opening />} />
      <Route path="/ms/climb" element={<JourneyMap />} />
      <Route path="/ne" element={<Opening />} />
      <Route path="/ne/climb" element={<JourneyMap />} />
    </Routes>
  );
}
