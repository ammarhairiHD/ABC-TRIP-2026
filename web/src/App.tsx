import { useEffect } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { Opening } from "./screens/Opening";
import { MomentsMap } from "./screens/MomentsMap";
import { DaysMap } from "./screens/DaysMap";
import { GalleryPage } from "./screens/GalleryPage";
import { MomentPage } from "./screens/MomentPage";
import { PeoplePage } from "./screens/PeoplePage";
import { ProfilePage } from "./screens/ProfilePage";
import { SceneryPage } from "./screens/SceneryPage";
import { HowItsBuilt } from "./screens/HowItsBuilt";
import { Layout } from "./components/Layout";

/** /day/:n used to be its own page; it's now the Gallery at /gallery/:n.
 * Kept as a redirect so old links (shared before this rename) still land
 * somewhere real. */
function GalleryRedirect({ prefix }: { prefix: string }) {
  const { n } = useParams();
  return <Navigate to={`${prefix}/gallery/${n}`} replace />;
}

/** Every photo, video and sprite probe in the app is a plain <img> or
 * <video> -- including ones the lightbox library renders for its own
 * slides -- so this one check covers all of them without touching each
 * component. */
function isProtectedMediaElement(target: EventTarget | null): boolean {
  return target instanceof HTMLImageElement || target instanceof HTMLVideoElement;
}

/**
 * /ms and /ne prefixes are wired up per root CLAUDE.md so routing doesn't
 * need to change when those languages turn on, but every prefix renders the
 * same English screens for now (i18next is pinned to "en" - see src/i18n).
 *
 * Every screen except Opening gets the site-wide top bar + menu sheet
 * (Layout) -- Opening has its own full-bleed look and isn't wrapped.
 */
export function App() {
  // Blocks the long-press/right-click "save image" menu and native
  // click-drag on every photo, video and sprite, app-wide -- including the
  // lightbox's own slide elements. index.css's touch-callout/user-select/
  // user-drag rules handle most of this; this is the backstop for browsers
  // (mobile Chrome, Firefox) that still fire these events regardless. Only
  // contextmenu and dragstart are touched, so scrolling, pinch-zoom and
  // video controls (all touch/pointer-driven) are unaffected.
  useEffect(() => {
    function onContextMenu(e: MouseEvent) {
      if (isProtectedMediaElement(e.target)) e.preventDefault();
    }
    function onDragStart(e: DragEvent) {
      if (isProtectedMediaElement(e.target)) e.preventDefault();
    }
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Opening />} />
      <Route element={<Layout />}>
        <Route path="/climb" element={<MomentsMap />} />
        <Route path="/story" element={<DaysMap />} />
        <Route path="/gallery/:n" element={<GalleryPage />} />
        <Route path="/day/:n" element={<GalleryRedirect prefix="" />} />
        <Route path="/moments/:id" element={<MomentPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/people/:id" element={<ProfilePage />} />
        <Route path="/scenery" element={<SceneryPage />} />
        <Route path="/built" element={<HowItsBuilt />} />
      </Route>

      <Route path="/ms" element={<Opening />} />
      <Route element={<Layout />}>
        <Route path="/ms/climb" element={<MomentsMap />} />
        <Route path="/ms/story" element={<DaysMap />} />
        <Route path="/ms/gallery/:n" element={<GalleryPage />} />
        <Route path="/ms/day/:n" element={<GalleryRedirect prefix="/ms" />} />
        <Route path="/ms/moments/:id" element={<MomentPage />} />
        <Route path="/ms/people" element={<PeoplePage />} />
        <Route path="/ms/people/:id" element={<ProfilePage />} />
        <Route path="/ms/scenery" element={<SceneryPage />} />
        <Route path="/ms/built" element={<HowItsBuilt />} />
      </Route>

      <Route path="/ne" element={<Opening />} />
      <Route element={<Layout />}>
        <Route path="/ne/climb" element={<MomentsMap />} />
        <Route path="/ne/story" element={<DaysMap />} />
        <Route path="/ne/gallery/:n" element={<GalleryPage />} />
        <Route path="/ne/day/:n" element={<GalleryRedirect prefix="/ne" />} />
        <Route path="/ne/moments/:id" element={<MomentPage />} />
        <Route path="/ne/people" element={<PeoplePage />} />
        <Route path="/ne/people/:id" element={<ProfilePage />} />
        <Route path="/ne/scenery" element={<SceneryPage />} />
        <Route path="/ne/built" element={<HowItsBuilt />} />
      </Route>
    </Routes>
  );
}
