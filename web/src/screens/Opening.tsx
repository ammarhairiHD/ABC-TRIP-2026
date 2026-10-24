import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useJourney } from "../hooks/useJourney";
import { PixelButton } from "../components/PixelButton";

/**
 * No trip video exists yet (sprite art and footage are being made in
 * parallel), so the backdrop is a flat pixel "mountains at dusk" silhouette
 * for now. Swap in a <video loop muted> here later with no other changes.
 */
export function Opening() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useJourney();

  const peakAltitude = data
    ? Math.max(...data.days.map((d) => d.altitudeM ?? 0))
    : null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-end overflow-hidden bg-bg px-6 pb-12 text-center">
      <MountainBackdrop />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <p className="font-pixel text-[10px] text-accent-strong">{t("opening.eyebrow")}</p>
        <h1 className="font-pixel text-xl leading-loose text-ink">ABC Trip 2026</h1>
        <p className="text-sm text-ink-dim">{t("opening.dates")}</p>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <Stat value={data?.totals.days} label={t("opening.days")} loading={isLoading} />
          <Stat value={data?.totals.media} label={t("opening.photos")} loading={isLoading} />
          <Stat
            value={peakAltitude ? `${peakAltitude.toLocaleString()}m` : undefined}
            label={t("opening.highest")}
            loading={isLoading}
          />
        </div>

        <PixelButton className="mt-6" onClick={() => navigate("/climb")}>
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
      <span className="font-pixel text-base text-ink">{loading ? "···" : value ?? "—"}</span>
      <span className="text-[11px] text-ink-dim">{label}</span>
    </div>
  );
}

function MountainBackdrop() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 390 600"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      <rect width="390" height="600" fill="var(--color-bg)" />
      <polygon points="0,420 90,260 180,400 260,220 390,380 390,600 0,600" fill="var(--color-bg-soft)" />
      <polygon points="0,500 120,360 220,460 390,320 390,600 0,600" fill="var(--color-panel)" />
    </svg>
  );
}
