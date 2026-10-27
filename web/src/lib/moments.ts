import type { JourneyDay, JourneyMoment, MomentKind } from "../types/journey";

export interface FlatMoment {
  id: string;
  kind: MomentKind;
  dayId: number;
  altitudeM: number | null;
}

/** Every moment across every day, in the order /api/journey already returns
 * them (day_id, then sort_order) -- the one chronological order the climb
 * walks, moment-points.json is keyed against, and prev/next everywhere else
 * follows. */
export function flattenMoments(days: JourneyDay[]): FlatMoment[] {
  const flat: FlatMoment[] = [];
  for (const day of days) {
    for (const moment of day.moments as JourneyMoment[]) {
      flat.push({ id: moment.id, kind: moment.kind, dayId: day.id, altitudeM: day.altitudeM });
    }
  }
  return flat;
}
