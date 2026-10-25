import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface TopBarProps {
  onMenuOpen: () => void;
}

/** Site-wide header: brand (taps to the journey map) + menu button. Shown on
 * every screen except Opening (see components/Layout.tsx). */
export function TopBar({ onMenuOpen }: TopBarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b-2 border-panel-border bg-panel px-3">
      <button
        onClick={() => navigate("/climb")}
        className="min-h-11 py-2 font-pixel text-[11px] text-ink"
      >
        ABC Trip 2026
      </button>
      <button
        onClick={onMenuOpen}
        aria-label={t("nav.menu")}
        className="flex min-h-11 min-w-11 items-center justify-center font-pixel text-lg text-ink"
      >
        ☰
      </button>
    </header>
  );
}
