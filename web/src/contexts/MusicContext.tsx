import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// Presence of this key means the visitor explicitly turned music off this
// session -- absence means "on" (the default), not "unknown".
const STORAGE_KEY = "abctrip2026:music:off";
const TARGET_VOLUME = 0.3;
const FADE_MS = 500;
const AUDIO_SRC = "/audio/music.mp3";

interface MusicContextValue {
  isOn: boolean;
  toggle: () => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

function readExplicitlyOff(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeExplicitlyOff(off: boolean) {
  try {
    if (off) sessionStorage.setItem(STORAGE_KEY, "1");
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* best effort -- private tab or blocked storage just means the choice
       isn't remembered next reload, not a broken toggle */
  }
}

// Per-element fade cancellation: a newer fade on the same <audio> wins, so a
// quick on/off/on doesn't leave an old rAF loop still nudging the volume.
const fadeTokens = new WeakMap<HTMLAudioElement, symbol>();

function fadeVolume(audio: HTMLAudioElement, to: number, ms: number, onDone?: () => void) {
  const from = audio.volume;
  const token = Symbol();
  fadeTokens.set(audio, token);
  const start = performance.now();
  function step(now: number) {
    if (fadeTokens.get(audio) !== token) return;
    const t = Math.min(1, (now - start) / ms);
    audio.volume = from + (to - from) * t;
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      onDone?.();
    }
  }
  requestAnimationFrame(step);
}

/** App-wide background music: on by default, toggled from TopBar. Browsers
 * block audible autoplay until the visitor has interacted with the page, so
 * being "on" here just means "start as soon as there's a gesture to hang
 * playback off of" -- the <audio> element itself is only constructed (so
 * only ever fetched) inside that first gesture, never eagerly, never via a
 * rendered <audio> tag with a src set up front. Lives above the router so
 * the element and its playback position survive route changes.
 *
 * The one-time document-level listener below is what makes "the first
 * tap/click/key anywhere" start the music: a click on Opening's "Begin the
 * climb" button bubbles up through it just like a click anywhere else does,
 * so that moment needs no special-casing here. */
export function MusicProvider({ children }: { children: ReactNode }) {
  const [isOn, setIsOn] = useState(() => !readExplicitlyOff());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Mirrors `isOn` but updated synchronously (not via an effect), so the
  // async play()-succeeded callback below can tell -- even if the visitor
  // toggled off in the instant between calling play() and it resolving --
  // whether it should still fade the volume up or just pause again.
  const isOnRef = useRef(isOn);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "none";
      audio.loop = true;
      audio.volume = 0;
      audio.src = AUDIO_SRC;
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const start = useCallback(() => {
    const audio = ensureAudio();
    audio
      .play()
      .then(() => {
        if (!isOnRef.current) {
          audio.pause();
          return;
        }
        fadeVolume(audio, TARGET_VOLUME, FADE_MS);
      })
      .catch(() => {
        // Blocked by the browser's autoplay policy -- this gesture wasn't
        // one it accepted. The toggle button is still a direct way in.
      });
  }, [ensureAudio]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    fadeVolume(audio, 0, FADE_MS, () => audio.pause());
  }, []);

  const toggle = useCallback(() => {
    setIsOn((prev) => {
      const next = !prev;
      isOnRef.current = next;
      writeExplicitlyOff(!next);
      if (next) start();
      else stop();
      return next;
    });
  }, [start, stop]);

  // Armed once, while music is meant to be on and hasn't started yet: the
  // visitor's very first tap/click/key anywhere starts it. Turning music off
  // removes this (via the `isOn` dependency), so nothing restarts it later.
  useEffect(() => {
    if (!isOn) return;
    document.addEventListener("pointerdown", start, { once: true });
    document.addEventListener("keydown", start, { once: true });
    return () => {
      document.removeEventListener("pointerdown", start);
      document.removeEventListener("keydown", start);
    };
  }, [isOn, start]);

  useEffect(() => {
    function onVisibility() {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) {
        audio.pause();
      } else if (isOn && audio.currentTime > 0) {
        audio.play().catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isOn]);

  return <MusicContext.Provider value={{ isOn, toggle }}>{children}</MusicContext.Provider>;
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used within MusicProvider");
  return ctx;
}
