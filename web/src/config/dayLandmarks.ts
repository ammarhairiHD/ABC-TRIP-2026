/**
 * Which landmark sprite (web/public/sprites/{landmark}.png, 64x64, 1 frame)
 * shows on each day's node (DaysMap.tsx) and each of that day's moment
 * nodes (MomentsMap.tsx). Edit the ranges below to change it. A day with no
 * matching range, or whose PNG is missing from public/sprites/, falls back
 * to a plain marker instead.
 */
const DAY_LANDMARKS: { from: number; to: number; landmark: string }[] = [
  { from: 1, to: 2, landmark: "level-city" },
  { from: 3, to: 4, landmark: "level-forest" },
  { from: 5, to: 5, landmark: "level-abc" },
  { from: 6, to: 6, landmark: "level-snow" },
  { from: 7, to: 9, landmark: "level-city" },
  { from: 10, to: 11, landmark: "level-airport" },
];

export function landmarkForDay(day: number): string | null {
  return DAY_LANDMARKS.find((range) => day >= range.from && day <= range.to)?.landmark ?? null;
}
