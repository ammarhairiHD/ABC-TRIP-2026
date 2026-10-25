export interface JourneyDay {
  id: number;
  date: string;
  altitudeM: number | null;
  half: "climb" | "home";
  mediaCount: number;
  coverThumbUrl: string | null;
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

export interface DayResponse {
  day: DayInfo;
  people: DayPerson[];
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
