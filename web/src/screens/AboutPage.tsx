import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Sprite } from "../components/Sprite";
import { PixelIcon, type PixelIconName } from "../components/PixelIcon";
import { cn } from "../lib/utils";

const EMAIL_USER = "ammarhairi";
const EMAIL_DOMAIN = "gmail.com";

interface SocialLink {
  icon: PixelIconName;
  labelKey: "instagram" | "portfolio" | "linkedin" | "youtube";
  href: string;
}

const LINKS: SocialLink[] = [
  { icon: "camera", labelKey: "instagram", href: "https://www.instagram.com/ammar.hairi_/" },
  { icon: "globe", labelKey: "portfolio", href: "https://www.ammarhairi.tech/" },
  { icon: "profile", labelKey: "linkedin", href: "https://www.linkedin.com/in/ammar-hairi/" },
  { icon: "play", labelKey: "youtube", href: "https://www.youtube.com/@ammarhairi/featured" },
];

const buttonClass =
  "flex min-h-11 w-full items-center gap-3 border-2 border-panel-border bg-panel px-4 py-3 font-pixel text-[11px] text-ink shadow-[3px_3px_0_0_var(--color-panel-border)] transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none";

/** /about: the "made by" page. The link row intentionally draws its own
 * generic pixel icons (PixelIcon) instead of real brand logos. The email
 * address is never written into the HTML -- only its obfuscated display
 * text ("ammarhairi [at] gmail.com") is -- the mailto: URI is assembled
 * from EMAIL_USER/EMAIL_DOMAIN at click time so a scraper reading the
 * markup never sees a real address. */
export function AboutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-bg pb-12">
      <header className="flex items-center justify-between px-2 py-2">
        <button
          onClick={() => navigate(-1)}
          aria-label={t("common.back")}
          className="flex min-h-11 min-w-11 items-center justify-center font-pixel text-lg text-ink"
        >
          ←
        </button>
        <div className="font-pixel text-[11px] text-accent-strong">{t("about.title")}</div>
        <span className="min-w-11" aria-hidden />
      </header>

      <div className="mx-auto flex max-w-xs flex-col items-center gap-4 px-6 text-center">
        <Sprite
          fileName="ammar.png"
          frameCount={2}
          initials="AH"
          fallbackFileName="ammar-walk.png"
          fallbackFrameCount={4}
          loop="idle"
          animate={!reducedMotion}
          scale={6}
        />
        <h1 className="font-pixel text-base text-ink">Ammar Hairi</h1>

        <div className="border-2 border-panel-border bg-panel p-4 text-left shadow-[3px_3px_0_0_var(--color-bg)]">
          {(t("about.bio", { returnObjects: true }) as string[]).map((paragraph, i) => (
            <p key={i} className={cn("text-sm leading-relaxed text-ink-dim", i > 0 && "mt-3")}>
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-2 flex w-full flex-col gap-3">
          {LINKS.map((link) => (
            <a
              key={link.labelKey}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass}
            >
              <PixelIcon name={link.icon} />
              {t(`about.${link.labelKey}`)}
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              window.location.href = `mailto:${EMAIL_USER}@${EMAIL_DOMAIN}`;
            }}
            className={buttonClass}
          >
            <PixelIcon name="envelope" />
            {t("about.emailDisplay")}
          </button>
        </div>

        <div className="mt-8 border-t-2 border-panel-border pt-6">
          <h2 className="font-pixel text-sm text-ink">{t("built.title")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-dim">{t("built.body")}</p>
        </div>
      </div>
    </div>
  );
}
