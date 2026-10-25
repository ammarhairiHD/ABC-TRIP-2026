import { useTranslation } from "react-i18next";
import { Sprite } from "./Sprite";

/**
 * Small inline loader for story text loading inside a bottom sheet (e.g.
 * DialogueBox) -- a mini walking sprite and animated "...", not the full
 * LoadingScreen overlay.
 */
export function InlineLoader() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3">
      <Sprite fileName="ammar-walk.png" frameCount={4} initials="A" loop="walk" animate scale={2} />
      <span className="font-pixel text-[11px] text-ink-dim">
        {t("loading.label")}
        <span className="loading-dots" aria-hidden="true" />
      </span>
    </div>
  );
}
