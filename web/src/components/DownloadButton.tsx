import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createIcon, useLightboxState } from "yet-another-react-lightbox";
import { useConfig } from "../hooks/useConfig";
import { useUnlockToken } from "../hooks/useUnlockToken";
import { UnlockSheet } from "./UnlockSheet";

const DOWNLOAD_SCOPE = "download";

// Material-style glyph (same 24x24/path convention as the lightbox's own
// built-in Close/Previous/Next icons) rather than the app's pixel-art
// icons, so it sits consistently next to them in the same toolbar.
const DownloadIcon = createIcon("Download", <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />);

interface DownloadSlide {
  mediaId?: string;
}

/** Toolbar button for the shared lightbox (GalleryPage, MomentPage,
 * ProfilePage, SceneryPage). Entirely self-contained: reads the current
 * slide via the library's own useLightboxState(), so each screen only adds
 * `toolbar={{ buttons: [<DownloadButton key="download" />, "close"] }}`. */
export function DownloadButton() {
  const { t } = useTranslation();
  const { data: config } = useConfig();
  const { token, isUnlocked, unlock, logout } = useUnlockToken(DOWNLOAD_SCOPE);
  const { currentSlide } = useLightboxState();
  const mediaId = (currentSlide as DownloadSlide | undefined)?.mediaId;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"rateLimited" | "failed" | null>(null);
  const anchorRef = useRef<HTMLAnchorElement | null>(null);

  const startDownload = useCallback(
    async (activeToken: string, id: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/download/${id}/link`, {
          method: "POST",
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        if (res.status === 401) {
          logout();
          setSheetOpen(true);
          return;
        }
        if (res.status === 429) {
          setError("rateLimited");
          return;
        }
        if (!res.ok) {
          setError("failed");
          return;
        }
        const { url } = (await res.json()) as { url: string };
        const anchor = anchorRef.current;
        if (anchor) {
          anchor.href = url;
          anchor.click();
        }
      } catch {
        setError("failed");
      } finally {
        setBusy(false);
      }
    },
    [logout]
  );

  // Same pending/resume shape SceneryPage.tsx uses for pendingEditId: the
  // unlock sheet's onUnlocked fires before this component's own `token`
  // state has re-rendered, so the actual download waits for that re-render
  // via this effect instead of trying to use a stale closure over `token`.
  useEffect(() => {
    if (pendingDownload && token && mediaId) {
      setPendingDownload(false);
      void startDownload(token, mediaId);
    }
  }, [pendingDownload, token, mediaId, startDownload]);

  const handleClick = useCallback(() => {
    if (!mediaId || busy) return;
    if (isUnlocked && token) {
      void startDownload(token, mediaId);
    } else {
      setPendingDownload(true);
      setSheetOpen(true);
    }
  }, [mediaId, busy, isUnlocked, token, startDownload]);

  if (!config?.downloadsEnabled || !mediaId) return null;

  return (
    <>
      {/* Plain button styled with the lightbox's own CSS classes (not
          IconButton: its `label` prop is typed to the library's fixed set
          of built-in labels, not an arbitrary translated string). */}
      <button
        type="button"
        className="yarl__button"
        title={t("viewer.download")}
        aria-label={t("viewer.download")}
        onClick={handleClick}
        disabled={busy}
      >
        <DownloadIcon className="yarl__icon" />
      </button>
      {error && (
        <p className="absolute right-3 top-14 z-10 max-w-[200px] text-right text-xs text-clay">
          {error === "rateLimited" ? t("unlock.rateLimited") : t("unlock.wrong")}
        </p>
      )}
      {/* Never shown: Content-Disposition: attachment on the response
          triggers the browser's save flow on click without navigating
          away from the lightbox. */}
      <a ref={anchorRef} download className="hidden" aria-hidden tabIndex={-1} />

      <UnlockSheet
        open={sheetOpen}
        title={t("unlock.title")}
        body={t("unlock.body")}
        codeLabel={t("unlock.code")}
        submitLabel={t("unlock.submit")}
        cancelLabel={t("unlock.cancel")}
        wrongCodeMessage={t("unlock.wrong")}
        rateLimitedMessage={t("unlock.rateLimited")}
        onSubmit={unlock}
        onUnlocked={() => setSheetOpen(false)}
        onClose={() => {
          setSheetOpen(false);
          setPendingDownload(false);
        }}
      />
    </>
  );
}
