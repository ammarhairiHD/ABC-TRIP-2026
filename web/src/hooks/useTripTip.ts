import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePeopleContent } from "./usePeopleContent";
import { usePeople } from "./usePeople";
import type { PeopleContent, PeopleResponse } from "../types/people";

const TIP_ROTATE_MS = 4000;

function pickRandom<T>(items: T[], exclude?: T): T {
  if (items.length <= 1) return items[0]!;
  let choice: T;
  do {
    choice = items[Math.floor(Math.random() * items.length)]!;
  } while (choice === exclude);
  return choice;
}

// Pairs each person's trait (people.json, via i18n) with their nickname
// (/api/people, language-free) for a "TIP: <nickname> <trait>" line. Falls
// back to the built-in tips in en.json until both have loaded.
function buildTips(
  peopleContent: PeopleContent | undefined,
  people: PeopleResponse | undefined,
  builtInTips: string[]
): string[] {
  if (!peopleContent || !people) return builtInTips;
  const nicknameById = new Map(people.people.map((p) => [p.id, p.nickname]));
  const fromPeople = Object.entries(peopleContent.person)
    .map(([id, info]) => {
      const nickname = nicknameById.get(id);
      return info.trait && nickname ? `${nickname}: ${info.trait}` : null;
    })
    .filter((tip): tip is string => tip !== null);
  return fromPeople.length > 0 ? fromPeople : builtInTips;
}

/**
 * Shared trip-tip picker for LoadingScreen and LevelTransition: rerolls a
 * "TIP: ..." line every ~4s, built from people's traits once that content
 * has loaded, falling back to the built-in tips in en.json until then.
 */
export function useTripTip(): string {
  const { t } = useTranslation();
  const { data: peopleContent } = usePeopleContent();
  const { data: people } = usePeople();

  const builtInTips = t("loading.tips", { returnObjects: true }) as string[];
  const tips = useMemo(
    () => buildTips(peopleContent, people, builtInTips),
    [peopleContent, people, builtInTips]
  );

  const [tip, setTip] = useState(() => pickRandom(tips));

  // Once real tips arrive after the built-ins, jump to one of them right away
  // instead of waiting out the rest of the rotation interval.
  useEffect(() => {
    setTip((current) => (tips.includes(current) ? current : pickRandom(tips)));
  }, [tips]);

  useEffect(() => {
    const interval = setInterval(() => setTip((current) => pickRandom(tips, current)), TIP_ROTATE_MS);
    return () => clearInterval(interval);
  }, [tips]);

  return tip;
}
