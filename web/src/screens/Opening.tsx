import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useJourney } from "../hooks/useJourney";
import { PixelButton } from "../components/PixelButton";
import { PixelIcon } from "../components/PixelIcon";

/**
 * No trip video exists yet (sprite art and footage are being made in
 * parallel), so the backdrop is a photo for now. Swap in a <video loop
 * muted> here later with no other changes.
 */
export function Opening() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useJourney();

  const peakAltitude = data
    ? Math.max(...data.days.map((d) => d.altitudeM ?? 0))
    : null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-end overflow-hidden bg-bg px-6 pb-8 text-center">
      <BackgroundPhoto />

      <div className="relative z-10 flex flex-col items-center gap-5 [text-shadow:var(--pixel-text-shadow)]">
        <p className="font-pixel text-[10px] text-accent-strong">
          {t("opening.eyebrow")}
        </p>
        <h1 className="font-pixel text-xl leading-loose text-ink">
          ABC Trip 2026
        </h1>

        <p className="flex items-center gap-1.5 font-pixel text-[9px] uppercase tracking-wide text-ink-dim">
          <span>{t("opening.madeby")}</span>
          <span className="text-accent-strong">Ammar Hairi</span>
          <PixelIcon name="mountain" size={12} className="text-accent-strong" />
        </p>
        <p className="text-sm text-ink-dim">{t("opening.dates")}</p>

        <div className="mt-3 grid grid-cols-3 gap-4">
          <Stat
            value={data?.totals.days}
            label={t("opening.days")}
            loading={isLoading}
          />
          <Stat
            value={data?.totals.media?.toLocaleString()}
            label={t("opening.photos")}
            loading={isLoading}
          />
          <Stat
            value={
              peakAltitude ? `${peakAltitude.toLocaleString()}m` : undefined
            }
            label={t("opening.highest")}
            loading={isLoading}
          />
        </div>

        <PixelButton className="mt-5" onClick={() => navigate("/climb")}>
          {t("opening.begin")}
        </PixelButton>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  loading,
}: {
  value: string | number | undefined;
  label: string;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-pixel text-base text-ink">
        {loading ? "···" : (value ?? "—")}
      </span>
      <span className="text-[11px] text-ink-dim">{label}</span>
    </div>
  );
}

/** Vertical scrim: barely-there over the summit so it stays visible, ramping
 * to ~85% dark-purple by the point the text block starts, so every text
 * element has enough flat background behind it to pass WCAG AA regardless
 * of how bright that part of the photo is. Stops tuned against rendered
 * screenshots -- see opening-contrast.mjs. */
const SCRIM_GRADIENT =
  "linear-gradient(to bottom, rgba(29,26,47,0.05) 0%, rgba(29,26,47,0.1) 38%, rgba(29,26,47,0.45) 55%, rgba(29,26,47,0.8) 70%, rgba(29,26,47,0.85) 82%, rgba(29,26,47,0.88) 100%)";

function BackgroundPhoto() {
  return (
    <div className="absolute inset-0">
      <img
        src="/background-1600.webp"
        srcSet="/background-800.webp 800w, /background-1600.webp 1600w"
        sizes="100vw"
        alt=""
        aria-hidden
        fetchPriority="high"
        className="h-full w-full object-cover object-[center_30%]"
      />
      <div className="absolute inset-0" style={{ background: SCRIM_GRADIENT }} />
    </div>
  );
}
