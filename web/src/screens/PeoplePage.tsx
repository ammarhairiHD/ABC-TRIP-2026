import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePeople } from "../hooks/usePeople";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useDelayedVisible } from "../hooks/useDelayedVisible";
import { Sprite } from "../components/Sprite";
import { LoadingScreen } from "../components/LoadingScreen";
import { initials } from "../lib/initials";
import { cn } from "../lib/utils";
import type { PersonListItem } from "../types/people";

const GRID_COLS = 3;
const RANDOM_TILE_ID = "__random__";

/** A tile slot: either a real person, or the one "? RANDOM" slot. Both are
 * real buttons in the same flat, arrow-key-navigable list -- see `useTiles`. */
interface TileSlot {
  id: string;
  person: PersonListItem | null;
}

function useTiles(data: { people: PersonListItem[] } | undefined) {
  return useMemo(() => {
    const people = data?.people ?? [];
    const byNickname = (a: PersonListItem, b: PersonListItem) => a.nickname.localeCompare(b.nickname);

    const organisers = people.filter((p) => p.role === "agency").sort(byNickname);
    const ammarEntry = people.find((p) => p.id === "ammar") ?? null;
    const trekkers = [
      ...(ammarEntry ? [ammarEntry] : []),
      ...people.filter((p) => p.role === "trekker" && p.id !== "ammar").sort(byNickname),
    ];
    const porters = people.filter((p) => p.role === "porter").sort(byNickname);

    const sections = [
      organisers.length > 0 ? { key: "organisers", people: organisers } : null,
      trekkers.length > 0 ? { key: "trekkers", people: trekkers } : null,
      porters.length > 0 ? { key: "porters", people: porters } : null,
    ].filter((s): s is { key: string; people: PersonListItem[] } => s !== null);

    // One flat list backs keyboard arrow navigation across every section
    // plus the random tile, in reading order -- see handleArrowKey below.
    const flat: TileSlot[] = [
      ...sections.flatMap((s) => s.people.map((p): TileSlot => ({ id: p.id, person: p }))),
      { id: RANDOM_TILE_ID, person: null },
    ];

    return { sections, flat, allPeople: people };
  }, [data]);
}

function PersonTile({
  slot,
  cursorOn,
  tabIndex,
  reducedMotion,
  registerRef,
  onActivate,
  onFocus,
  onPointerEnter,
  onPointerLeave,
  onArrowKey,
}: {
  slot: TileSlot;
  cursorOn: boolean;
  tabIndex: number;
  reducedMotion: boolean;
  registerRef: (el: HTMLButtonElement | null) => void;
  onActivate: () => void;
  onFocus: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onArrowKey: (e: KeyboardEvent) => void;
}) {
  const { t } = useTranslation();
  const isRandom = slot.person === null;
  const label = isRandom ? t("peoplePage.randomLabel") : slot.person!.nickname;

  return (
    <div className="relative flex flex-col items-center p-2">
      {cursorOn && (
        <span
          aria-hidden
          className={cn(
            "absolute -top-1 left-1/2 z-10 -translate-x-1/2 font-pixel text-[10px] text-accent-strong",
            !reducedMotion && "animate-cursor-bob"
          )}
        >
          ▼
        </span>
      )}
      <button
        ref={registerRef}
        type="button"
        tabIndex={tabIndex}
        aria-label={label}
        onFocus={onFocus}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onClick={onActivate}
        onKeyDown={onArrowKey}
        className={cn(
          "flex w-full flex-col items-center gap-1.5 border-2 border-panel-border bg-panel p-2.5 pt-3 transition-transform",
          "shadow-[2px_2px_0_0_var(--color-bg)]",
          "hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none",
          "active:translate-y-0.5 active:shadow-none"
        )}
      >
        {isRandom ? (
          <div className="flex h-[96px] w-[96px] items-center justify-center font-pixel text-2xl text-accent-strong">
            ?
          </div>
        ) : (
          <Sprite
            fileName={`${slot.person!.id}.png`}
            frameCount={2}
            initials={initials(slot.person!.nickname)}
            loop="idle"
            animate={!reducedMotion}
            scale={3}
          />
        )}
        <span className="truncate text-center text-[10px] text-ink-dim">
          {isRandom ? t("peoplePage.random") : slot.person!.nickname}
        </span>
      </button>
    </div>
  );
}

export function PeoplePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { data, isLoading } = usePeople();
  const { sections, flat, allPeople } = useTiles(data);

  const [cursorOnId, setCursorOnId] = useState<string | null>(null);
  const tileRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const openProfile = useCallback((id: string) => navigate(`/people/${id}`), [navigate]);

  const handleActivate = useCallback(
    (slot: TileSlot) => {
      if (slot.person === null) {
        if (allPeople.length === 0) return;
        const choice = allPeople[Math.floor(Math.random() * allPeople.length)]!;
        openProfile(choice.id);
        return;
      }
      openProfile(slot.id);
    },
    [allPeople, openProfile]
  );

  const focusTile = useCallback((id: string) => {
    tileRefs.current.get(id)?.focus();
  }, []);

  const handleArrowKey = useCallback(
    (e: KeyboardEvent, currentId: string) => {
      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      const index = flat.findIndex((s) => s.id === currentId);
      if (index === -1) return;
      let next = index;
      if (e.key === "ArrowRight") next = Math.min(flat.length - 1, index + 1);
      else if (e.key === "ArrowLeft") next = Math.max(0, index - 1);
      else if (e.key === "ArrowDown") next = Math.min(flat.length - 1, index + GRID_COLS);
      else if (e.key === "ArrowUp") next = Math.max(0, index - GRID_COLS);
      focusTile(flat[next]!.id);
    },
    [flat, focusTile]
  );

  const pageLoading = isLoading || !data;
  const showLoader = useDelayedVisible(pageLoading);
  if (pageLoading) {
    return showLoader ? <LoadingScreen /> : null;
  }

  return (
    <div className="min-h-screen bg-bg pb-10">
      <header className="flex items-center justify-between px-2 py-2">
        <button
          onClick={() => navigate(-1)}
          aria-label={t("common.back")}
          className="flex min-h-11 min-w-11 items-center justify-center font-pixel text-lg text-ink"
        >
          ←
        </button>
        <span className="min-w-11" aria-hidden />
      </header>

      <div className="flex flex-col items-center gap-2 px-6 pb-3 text-center">
        <h1 className="font-pixel text-sm uppercase leading-relaxed text-accent-strong">
          {t("peoplePage.title")}
        </h1>
        <p
          className={cn(
            "font-pixel text-[10px] uppercase text-ink-dim",
            !reducedMotion && "animate-select-hint-blink"
          )}
        >
          {t("peoplePage.selectHint")}
        </p>
      </div>

      {sections.map((section) => (
        <div key={section.key} className="mt-4">
          <h2 className="px-3 pb-1 font-pixel text-[11px] text-accent-strong">
            {t(`peoplePage.${section.key}`)}
          </h2>
          <div className="grid grid-cols-3">
            {section.people.map((person) => {
              const slot: TileSlot = { id: person.id, person };
              return (
                <PersonTile
                  key={person.id}
                  slot={slot}
                  cursorOn={cursorOnId === person.id}
                  tabIndex={flat[0]?.id === person.id ? 0 : -1}
                  reducedMotion={reducedMotion}
                  registerRef={(el) => {
                    if (el) tileRefs.current.set(person.id, el);
                    else tileRefs.current.delete(person.id);
                  }}
                  onActivate={() => handleActivate(slot)}
                  onFocus={() => setCursorOnId(person.id)}
                  onPointerEnter={() => setCursorOnId(person.id)}
                  onPointerLeave={() => setCursorOnId((id) => (id === person.id ? null : id))}
                  onArrowKey={(e) => handleArrowKey(e, person.id)}
                />
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-5">
        <div className="grid grid-cols-3">
          {(() => {
            const slot: TileSlot = { id: RANDOM_TILE_ID, person: null };
            return (
              <PersonTile
                slot={slot}
                cursorOn={cursorOnId === RANDOM_TILE_ID}
                tabIndex={flat[0]?.id === RANDOM_TILE_ID ? 0 : -1}
                reducedMotion={reducedMotion}
                registerRef={(el) => {
                  if (el) tileRefs.current.set(RANDOM_TILE_ID, el);
                  else tileRefs.current.delete(RANDOM_TILE_ID);
                }}
                onActivate={() => handleActivate(slot)}
                onFocus={() => setCursorOnId(RANDOM_TILE_ID)}
                onPointerEnter={() => setCursorOnId(RANDOM_TILE_ID)}
                onPointerLeave={() => setCursorOnId((id) => (id === RANDOM_TILE_ID ? null : id))}
                onArrowKey={(e) => handleArrowKey(e, RANDOM_TILE_ID)}
              />
            );
          })()}
        </div>
      </div>
    </div>
  );
}
