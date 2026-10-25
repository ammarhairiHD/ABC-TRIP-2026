import { useTranslation } from "react-i18next";

/** Placeholder: Ammar will add the real architecture write-up later. */
export function HowItsBuilt() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <h1 className="font-pixel text-base text-ink">{t("built.title")}</h1>
      <p className="max-w-xs text-sm leading-relaxed text-ink-dim">{t("built.body")}</p>
    </div>
  );
}
