import { useTranslation } from "react-i18next";
import { useTripTip } from "../hooks/useTripTip";

interface LevelTransitionProps {
  dayNumber: number;
  altitudeM: number | null;
}

/**
 * Brief "entering a level" card shown for ~1s whenever a day page is
 * entered (see useDelayedVisible's { showAfterMs: 0, minVisibleMs: 1000 }
 * in DayPage), regardless of how fast the day's data loads -- distinct from
 * the generic LoadingScreen, which only appears after the 300ms rule.
 */
export function LevelTransition({ dayNumber, altitudeM }: LevelTransitionProps) {
  const { t } = useTranslation();
  const tip = useTripTip();

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg px-8"
    >
      <p className="font-pixel text-lg text-accent-strong">{t("climb.day", { n: dayNumber })}</p>
      {altitudeM != null && <p className="font-pixel text-sm text-ink">{altitudeM.toLocaleString()} m</p>}
      <p className="max-w-xs text-center text-[11px] leading-relaxed text-ink-dim">
        {t("loading.tipPrefix")} {tip}
      </p>
    </div>
  );
}
