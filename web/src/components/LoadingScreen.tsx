import { useTranslation } from "react-i18next";
import { useTripTip } from "../hooks/useTripTip";
import { Sprite } from "./Sprite";

/**
 * Full-screen 8-bit loading overlay: Ammar's sprite walking in place,
 * "LOADING" with animated dots, and a trip tip underneath that rerolls every
 * ~4s. Callers gate when this mounts with useDelayedVisible so it never
 * flashes on a fast load -- this component itself just renders unconditionally.
 */
export function LoadingScreen() {
  const { t } = useTranslation();
  const tip = useTripTip();

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-bg px-8"
    >
      <Sprite fileName="ammar-walk.png" frameCount={4} initials="A" loop="walk" animate scale={4} />
      <p className="font-pixel text-xs text-ink">
        {t("loading.label")}
        <span className="loading-dots" aria-hidden="true" />
      </p>
      <p className="max-w-xs text-center text-[11px] leading-relaxed text-ink-dim">
        {t("loading.tipPrefix")} {tip}
      </p>
    </div>
  );
}
