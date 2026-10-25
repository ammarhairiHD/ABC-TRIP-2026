export type MomentKind = "challenge" | "highlight" | "funny" | "farewell";

export interface JourneyMoment {
  id: string;
  kind: MomentKind;
  sortOrder: number | null;
}

export interface JourneyDay {
  id: number;
  date: string;
  altitudeM: number | null;
  half: "climb" | "home";
  mediaCount: number;
  coverThumbUrl: string | null;
  moments: JourneyMoment[];
}

export interface JourneyResponse {
  days: JourneyDay[];
  totals: {
    days: number;
    media: number;
  };
}

export interface DayContent {
  title: string;
  story: string;
}

export interface DayInfo {
  id: number;
  date: string;
  altitudeM: number | null;
  half: "climb" | "home";
}

export interface DayPerson {
  id: string;
  nickname: string;
  mediaCount: number;
}

export interface MomentHero {
  id: string;
  type: "photo" | "video";
  width: number;
  height: number;
  blurhash: string | null;
  thumbUrl: string;
  webUrl: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  previewClipUrl: string | null;
}

export interface DayMoment {
  id: string;
  kind: MomentKind;
  sortOrder: number | null;
  hero: MomentHero | null;
}

export interface DayResponse {
  day: DayInfo;
  people: DayPerson[];
  moments: DayMoment[];
}

export interface MediaFace {
  personId: string;
  nickname: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tS: number | null;
  confidence: number | null;
}

export interface DayMediaItem {
  id: string;
  type: "photo" | "video";
  seq: number | null;
  category: string;
  width: number;
  height: number;
  durationS: number | null;
  blurhash: string | null;
  thumbUrl: string;
  webUrl: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  faces: MediaFace[];
}

export interface DayMediaResponse {
  day: DayInfo;
  media: DayMediaItem[];
}
