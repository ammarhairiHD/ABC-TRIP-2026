import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePeople } from "../hooks/usePeople";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useDelayedVisible } from "../hooks/useDelayedVisible";
import { Sprite } from "../components/Sprite";
import { LoadingScreen } from "../components/LoadingScreen";
import { initials } from "../lib/initials";
import type { PersonListItem } from "../types/people";

function PersonTile({ person }: { person: PersonListItem }) {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  return (
    <button
      onClick={() => navigate(`/people/${person.id}`)}
      className="flex flex-col items-center gap-1 p-2"
    >
      <Sprite
        fileName={`${person.id}.png`}
        frameCount={2}
        initials={initials(person.nickname)}
        loop="idle"
        animate={!reducedMotion}
      />
      <span className="text-center text-[11px] text-ink-dim">{person.nickname}</span>
    </button>
  );
}

export function PeoplePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = usePeople();

  const { ammar, everyoneElse, porters } = useMemo(() => {
    const people = data?.people ?? [];
    const ammarEntry = people.find((p) => p.id === "ammar") ?? null;
    const byNickname = (a: PersonListItem, b: PersonListItem) => a.nickname.localeCompare(b.nickname);
    return {
      ammar: ammarEntry,
      everyoneElse: people.filter((p) => p.id !== "ammar" && p.role !== "porter").sort(byNickname),
      porters: people.filter((p) => p.role === "porter").sort(byNickname),
    };
  }, [data]);

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
        <div className="font-pixel text-[11px] text-accent-strong">{t("peoplePage.title")}</div>
        <span className="min-w-11" aria-hidden />
      </header>

      <div className="grid grid-cols-3">
        {ammar && <PersonTile key={ammar.id} person={ammar} />}
        {everyoneElse.map((person) => (
          <PersonTile key={person.id} person={person} />
        ))}
      </div>

      {porters.length > 0 && (
        <>
          <h2 className="mt-4 px-3 font-pixel text-[11px] text-accent-strong">{t("peoplePage.ourPorters")}</h2>
          <div className="grid grid-cols-3">
            {porters.map((person) => (
              <PersonTile key={person.id} person={person} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
